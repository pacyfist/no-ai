import { Component } from '@angular/core';
import { NoAiDirective } from '@pacyfist/no-ai';

@Component({
  selector: 'app-root',
  imports: [NoAiDirective],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
