import { mount } from 'destam-dom';
import { Observer } from 'destam';
import { Theme, Icons, Button, TextModifiers } from 'destamatic-ui';

import theme from './theme';
import TextField from './TextField';

// Example/test:
const value = Observer.mutable('hello world there!?!?!?!?!?! :frog: button');
const selection = Observer.mutable({ start: null, end: null, side: null });
Observer.timer(1000).watch(() => {
	const sel = selection.get();
	if (sel.start === 6 && sel.end === 12) {
		selection.set({ start: 0, end: 6 });
	} else {
		selection.set({ start: 6, end: 12 });
	}
});

const emojis = {
	frog: '🐸',
	smile: '😄',
	heart: '❤️',
	fire: '🔥',
	turtle: '🐢',
};

mount(document.body, <Theme value={theme.theme}>
	<Icons value={theme.icons}>
		<TextModifiers value={[
			{
				check: '!',
				return: (match) => <span style={{ color: 'red' }}>{match}</span>,
			},
			{
				check: '?',
				return: (match) => {
					const hover = Observer.mutable(false);
					return <span
						isHovered={hover}
						style={{ cursor: 'pointer', color: hover.bool('purple', 'pink') }}
					>{match}</span>
				},
			},
			{
				check: /hello/gi,
				return: (match) => <div><div style={{ background: 'blue' }}>{match}</div></div>,
				atomic: true,
			},
			{ // vscode style inline button.
				check: /world/gi,
				return: (match) => {
					const hover = Observer.mutable(false);
					const CtrlKey = Observer.mutable(false);

					document.addEventListener('keydown', e => {
						if (e.key === 'Control') CtrlKey.set(true);
					});
					document.addEventListener('keyup', e => {
						if (e.key === 'Control') CtrlKey.set(false);
					});

					const specialButton = Observer.all([hover, CtrlKey]).map(([h, c]) => h && c);

					return <div isHovered={hover} style={{ cursor: specialButton.bool('pointer', 'inherit'), background: specialButton.bool('blue', 'red') }}>{match}</div>
				},
				atomic: false,
			},
			{
				check: /button/gi,
				return: (match) => <Button type='contained'>{match}</Button>,
				atomic: true,
			},
			{
				check: /:([a-zA-Z0-9_]+):/g,
				return: (match) => {
					const key = match.slice(1, -1); // remove surrounding colons
					const emoji = emojis[key];
					return emoji ? <span>{emoji}</span> : match;
				}
			}
		]} >
			<TextField style={{ background: 'black' }} value={value} />
		</TextModifiers>
	</Icons>
</Theme>);
