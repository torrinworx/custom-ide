import { mount } from 'destam-dom';
import { Observer } from 'destam';
import { Theme, Icons, Button, Typography, TextModifiers } from 'destamatic-ui';

import theme from './theme';
import TextField from './TextField';

// Example/test:
const value = Observer.mutable('Hello World! :frog: :heart: :turtle: ????');
const cursor = Observer.mutable(6);
const selection = Observer.mutable({ start: 6, end: 12 });
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
		<TextField style={{ background: 'black' }} value={value} />

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
				return: (match) => <Button type='contained' onClick={() => alert(match)}>{match}</Button>,
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
			<Typography label={value} />
			<Typography>
				Hello World!
				<br />
				Hello World!
			</Typography>
		</TextModifiers>
	</Icons>
</Theme>);
