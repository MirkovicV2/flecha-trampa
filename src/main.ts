import './ui/styles.css';
import './ui/worlds.css';
import './ui/commerce.css';
import './ui/combos.css';
import './ui/atelier.css';
import './ui/chests.css';
import './ui/arena.css';
import './ui/mastery.css';
import './ui/pass.css';
import './ui/presentation.css';
import { GameApp } from './ui/app';
import { createProgressStore } from './services/platform';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('No se encontró la raíz de la aplicación.');
new GameApp(root, await createProgressStore());
