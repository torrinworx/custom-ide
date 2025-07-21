import { mount } from 'destam-dom';
import { Observer } from 'destam';
import { Theme, Icons, Button } from 'destamatic-ui';

import theme from './theme';
import TextField from './TextField';
import { Typography, TextModifiers } from './Typography';

// Example/test:
const value = Observer.mutable('Hello World! :frog: :heart: :turtle:');
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

const cursorRef = <raw:div>
	🫨
</raw:div>

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
				check: /hello/gi,
				return: (match) => <Button type='text' onClick={() => alert(match)}>{match}</Button>,
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
			<TextField style={{ background: 'black' }} value={value} cursorRef={cursorRef} />

			<Typography label={value} />
		</TextModifiers>
	</Icons>
</Theme>);
