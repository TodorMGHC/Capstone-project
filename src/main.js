import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './styles/global.css';
import { startApp } from './App.js';

const appRoot = document.querySelector('#app');

if (!appRoot) {
  throw new Error('App root element was not found.');
}

void startApp(appRoot);
