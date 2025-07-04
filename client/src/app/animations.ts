import { trigger, style, animate, transition, query, stagger, keyframes } from '@angular/animations';

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

export const highlightAnimation = trigger('highlight', [
  transition('* => *', [
    animate('1s ease-in-out', keyframes([
      style({ backgroundColor: 'rgba(0, 123, 255, 0.2)', offset: 0 }),
      style({ backgroundColor: 'transparent', offset: 1 })
    ]))
  ])
]);

export const flashAnimation = trigger('flash', [
  transition('* => *', [
    animate('0.8s ease-out', keyframes([
      style({ backgroundColor: 'rgba(0, 123, 255, 0.1)', boxShadow: '0 0 8px rgba(0, 123, 255, 0.3)', offset: 0.2 }),
      style({ backgroundColor: 'transparent', boxShadow: 'none', offset: 1 })
    ]))
  ])
]);
