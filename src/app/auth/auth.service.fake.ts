import { Injectable } from '@angular/core'
import { BehaviorSubject } from 'rxjs/BehaviorSubject'
import { Observable } from 'rxjs/Observable'
import 'rxjs/add/observable/throw'

@Injectable()
export class AuthServiceFake {
  isAuthenticated = new BehaviorSubject<boolean>(false)

  constructor() {}

  login(email: string, password: string): Observable<boolean> {
    if (email.toLowerCase().endsWith('@test.com')) {
      this.isAuthenticated.next(true)
      return this.isAuthenticated.asObservable()
    } else {
      this.isAuthenticated.next(false)
      return Observable.throw('Failed to login!')
    }
  }
}
