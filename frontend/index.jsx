import { mount } from 'destam-dom';
import { OArray, OObject, Observer, UUID } from 'destam';
import { TextField, Typography, Theme, Icons } from 'destamatic-ui';

import theme from './theme.js';

const lines = OArray([
	OObject({
		value: '',
		id: UUID().toHex()
	})
]);

const currentLine = Observer.mutable(0);

const Line = ({ each }) => {
	const isLineChange = Observer.mutable(false);
	const isFocusedChange = Observer.mutable(false);
	const index = Observer.mutable(lines.indexOf(each));
	lines.observer.shallow().watch(() => {
		console.log(lines.indexOf(each), each);
		index.set(lines.indexOf(each));
	});

	const focused = Observer.mutable(false);

	focused.watch(() => {
		if (!isLineChange.get()) {
			isFocusedChange.set(true);
			currentLine.set(index.get());
			isFocusedChange.set(false);
		};
	});

	currentLine.watch(() => {
		if (!isFocusedChange.get()) {
			isLineChange.set(true);
			const curln = currentLine.get();
			focused.set(curln === index.get());
			isLineChange.set(false);
		}
	});

	return <div theme="row_spread" style={{ gap: 10 }}>
		<Typography type="p1" label={index} />
		<TextField style={{ width: '100%' }} value={each.observer.path('value')} focus={focused} />
	</div>;
};

const Wrapper = <raw:div />;
Wrapper.addEventListener('keydown', e => {
	if (e.key === 'Enter') {
		const curln = currentLine.get();
		lines.splice(curln + 1, 0, OObject({
			value: '',
			id: UUID().toHex()
		}));
		currentLine.set(curln + 1);
	} else if (e.key === 'Backspace') {
		const curln = currentLine.get();
		if (curln != 0 && lines[curln].value.length === 0) {
			lines.splice(curln, 1);
			currentLine.set(curln - 1);
		}
	}
});

mount(document.body, <Theme value={theme.theme}>
	<Icons value={theme.icons}>
		<Wrapper>
			<Line each={lines} />
		</Wrapper>
	</Icons>
</Theme>);
