import { Injectable } from '@angular/core'
import { Role } from './role.enum'
import { BehaviorSubject } from 'rxjs/BehaviorSubject'
import { Observable } from 'rxjs/Observable'
import 'rxjs/add/observable/throw'
import { catchError, tap } from 'rxjs/operators'
import { CacheService } from './cache.service'
import * as decode from 'jwt-decode'
import { HttpClient } from '@angular/common/http'
import { ErrorObservable } from 'rxjs/observable/ErrorObservable'
import { transformError } from '../common'
import { environment } from '../../environments/environment'
import { of } from 'rxjs/observable/of'
import * as jwt from 'jsonwebtoken' // For fakeAuthProvider only
import { map, filter, reduce } from 'rxjs/operators'

export interface IAuthStatus {
  isAuthenticated: boolean
  userRole: Role
  userId: string
}

interface IServerAuthResponse {
  accessToken: string
}

const defaultAuthStatus = { isAuthenticated: false, userRole: Role.None, userId: null }

@Injectable()
export class AuthService extends CacheService {
  private readonly authProvider: (
    email: string,
    password: string
  ) => Observable<IServerAuthResponse>
  authStatus = new BehaviorSubject<IAuthStatus>(
    this.getItem('authStatus') || defaultAuthStatus
  )

  constructor(private httpClient: HttpClient) {
    super()
    this.authStatus.subscribe(authStatus => this.setItem('authStatus', authStatus))
    // Fake login function to simulate roles
    this.authProvider = this.fakeAuthProvider
    // Example of a real login call to server-side
    // this.authProvider = this.exampleAuthProvider
  }

  login(email: string, password: string): Observable<IAuthStatus> {
    this.logout()

    let loginResponse = this.authProvider(email, password).pipe(
      map(value => decode(value.accessToken)),
      catchError(transformError)
    )

    loginResponse.subscribe(
      res => {
        this.authStatus.next(res)
      },
      err => {
        this.logout()
        return Observable.throw(err)
      }
    )

    return loginResponse
  }

  private exampleAuthProvider(
    email: string,
    password: string
  ): Observable<IServerAuthResponse> {
    return this.httpClient.post<IServerAuthResponse>(`${environment.baseUrl}/v1/login`, {
      email: email,
      password: password,
    })
  }

  private fakeAuthProvider(
    email: string,
    password: string
  ): Observable<IServerAuthResponse> {
    if (!email.toLowerCase().endsWith('@test.com')) {
      return Observable.throw('Failed to login! Email needs to end with @test.com.')
    }

    let authStatus = {
      isAuthenticated: true,
      userId: 'e4d1bc2ab25c',
      userRole: email.toLowerCase().includes('cashier')
        ? Role.Cashier
        : email.toLowerCase().includes('clerk')
          ? Role.Clerk
          : email.toLowerCase().includes('manager') ? Role.Manager : Role.None,
    } as IAuthStatus

    let authResponse = {
      accessToken: jwt.sign(authStatus, 'secret', {
        expiresIn: '1h',
        algorithm: 'none',
      }),
    } as IServerAuthResponse

    return of(authResponse)
  }

  logout() {
    this.clearToken()
    this.authStatus.next(defaultAuthStatus)
  }

  private setToken(jwt: string) {
    this.setItem('jwt', jwt)
  }

  private getDecodedToken(): IAuthStatus {
    return decode(this.getStringItem('jwt'))
  }

  getToken(): string {
    return this.getStringItem('jwt')
  }

  private clearToken() {
    this.removeItem('jwt')
  }
}
