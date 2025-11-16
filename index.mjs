import frameworkz from './lib/frameworkz.mjs';
import viewzSsr from './server/viewzSsr.mjs';

export let startViewZ = frameworkz.startViewZ ;
export let createMiddleware = viewzSsr.createMiddleware ;
export let generateSsrContent = viewzSsr.generateSsrContent ;