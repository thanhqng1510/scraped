import { trigger, style, animate, transition, query, stagger } from '@angular/animations';

export const listAnimation = trigger('listAnimation', [
  transition('* => *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(-20px)' }),
      stagger('50ms', [
        animate('150ms ease-out', style({ opacity: 1, transform: 'none' }))
      ])
    ], { optional: true }),
    query(':leave', [
      animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(20px)' }))
    ], { optional: true })
  ])
]);
