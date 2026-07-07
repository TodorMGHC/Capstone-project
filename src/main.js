import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './styles/global.css';
import { startRouter } from './router/router.js';

const appRoot = document.querySelector('#app');

if (!appRoot) {
  throw new Error('App root element was not found.');
}

startRouter(appRoot);
