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

// Wonder if there is some kind of optimization we could apply? each line is constantly checking it's index every time something
// is pushed to 'lines'. How else can it keep track of it's own index?
const Line = ({ each }, cleanup) => {
	const isLineChange = Observer.mutable(false);
	const isFocusedChange = Observer.mutable(false);
	const index = Observer.mutable(lines.indexOf(each));
	const focused = Observer.mutable(false);

	// update index when lines is pushed/sliced
	cleanup(lines.observer.shallow(2).watch(() => index.set(lines.indexOf(each))));

	// Update currentLine if focused is true
	cleanup(focused.watch(() => {
		if (!isLineChange.get()) {
			isFocusedChange.set(true);
			currentLine.set(index.get());
			isFocusedChange.set(false);
		};
	}));

	// Update focused if current line index matches index.
	cleanup(currentLine.watch(() => {
		if (!isFocusedChange.get()) {
			isLineChange.set(true);
			const curln = currentLine.get();
			focused.set(curln === index.get());
			isLineChange.set(false);
		}
	}));

	return <div theme="row_spread" style={{ gap: 10 }}>
		<Typography type="p1" label={index} />
		<TextField theme='linefield' style={{ width: '100%' }} value={each.observer.path('value')} focus={focused} />
	</div>;
};

const Wrapper = <raw:div />;
Wrapper.addEventListener('keydown', e => {
	const curln = currentLine.get();

	if (e.key === 'Enter') {
		lines.splice(curln + 1, 0, OObject({
			value: '',
			id: UUID().toHex()
		}));
		currentLine.set(curln + 1);
	} else if (e.key === 'Backspace') {
		if (curln !== 0 && lines[curln].value.length === 0) {
			lines.splice(curln, 1);
			currentLine.set(curln - 1);
		}
	} else if (e.key === 'ArrowUp') {
		if (curln > 0) {
			currentLine.set(curln - 1);
		}
	} else if (e.key === 'ArrowDown') {
		if (curln < lines.length - 1) {
			currentLine.set(curln + 1);
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
