import {createRoot} from 'react-dom/client';
import {StatsStep} from './StatsStep';
import {statsEngine} from './stats';
/* The original section, heading and engine stay in place. Only the visual
   controls are replaced, and only after React mounts successfully. */
export function installStats(){
  const section = document.getElementById('stats-creator');
  if (!section || !statsEngine()) return;
  const hide = (node: Element | null) => {
    if (node instanceof HTMLElement) node.style.display = 'none';
  };
  const roll = document.getElementById('stats-roll');
  const rollBlock = document.getElementById('stats-roll-controls');
  if (roll && rollBlock) rollBlock.append(roll);
  document.querySelector('#stats-creator .dice-table')?.remove();
  for (const selector of ['.stats-methods', '.stats-rule', '#stats-native-warning', '#stats-roll-controls', '#stats-allocation', '#stats-progress', '#stats-history']) {
    hide(section.querySelector(selector));
  }
  const root = document.createElement('div');
  root.className = 'react-stats-step';
  section.querySelector('h2')?.after(root);
  createRoot(root).render(<StatsStep />);
}
