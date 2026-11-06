import './ui/styles.css';
import { GameApp } from './ui/app';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('No se encontró la raíz de la aplicación.');
new GameApp(root);
