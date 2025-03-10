import { CommonModule } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { authInterceptor } from './interceptors/auth.interceptor';
import { AuthService } from './services/auth.service';
import { MoodService } from './services/mood.service';
import { NotificationService } from './services/notification.service';
import { SocketService } from './services/socket.service';
import { TicTacToeService } from './services/tic-tac-toe.service';
import { UploadService } from './services/upload.service';
import { UserService } from './services/user.service';
import { WorldDaysService } from './services/world-days.service';

@NgModule({
  declarations: [],
  imports: [CommonModule],
  providers: [
    AuthService,
    provideHttpClient(withInterceptors([authInterceptor])),
    SocketService,
    MoodService,
    UserService,
    UploadService,
    NotificationService,
    TicTacToeService,
    WorldDaysService,
  ],
})
export class CoreModule { }
