import { mount } from 'destam-dom';
import { Observer } from 'destam';
import { Theme, Icons, Shown } from 'destamatic-ui';

import theme from './theme';
import TextField from './TextField';
import { Typography, TextModifiers } from './Typography';


// Example/test:
const value = Observer.mutable('Hello World!');
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

const value2 = Observer.mutable('Welcome!')

mount(document.body, <Theme value={theme.theme}>
	<Icons value={theme.icons}>
		<TextField style={{ background: 'black' }} value={value} cursor={cursor} />
		<TextField style={{ background: 'black' }} value={value2} cursorRef={cursorRef} />

		<TextModifiers value={[]} >
			<Typography />
		</TextModifiers>
	</Icons>
</Theme>);
