import { mount } from 'destam-dom';
import { OArray, OObject, Observer, UUID } from 'destam';
import { TextField, Typography, Theme, Icons } from 'destamatic-ui';

import theme from './theme.js';

/**
 * Creates a new linked-list line object:
 *  - value: the text inside the line
 *  - lineNumber: will be assigned whenever we do a "renumberAll()" pass
 *  - prev/next: references for quick up/down navigation
 */
const createLine = (value = '') => OObject({
	id: UUID().toHex(),
	value,
	lineNumber: 0,
	prev: null,
	next: null
});

/*
Text is a fully custom, destamatic-ui, ground up text input component.

The existing textarea and input with type text browser primities don't offer
enough customization. This component combines the two, while offering the 
same level of customization expected from any destamatic-ui component.

Features:
- area and input modes. Area is equivelant to a <textarea />, while input is equivelant to an <input type='text' />
  area mode is enabled when value is type of OArray/Array. input mode is enabled when value is type string or mutable Observer.
- numbered lines. Disabled by default, line numbers are visible in area mode.
- partial line rendering. Only renders lines that are visible in the ref container. Others slightly outside aren't rendered
  until the user scrolls to them. This prevents lag and keeps the number/indexing processing efficient.
- programming language syntax highlighting. Equivelent to a styled <codeblock /> element. allows you to select a langauge
  that automatically converts the text into different colours.
*/
const Text = ({
	value,
	ref: Ref,
}, cleanup) => {
	const cursorPosition = Observer.mutable(null);
	if (!Ref) Ref = <raw:div />;

	const onKeyDown = (e) => {
		e.preventDefault();
		switch (e.key) {
			case 'Enter': {
			}

			case 'Backspace': {
				break;
			}

			case 'ArrowUp': {
				break;
			}

			case 'ArrowDown': {
				break;
			}
		}
	};

	const onClick = (e) => {
		const selection = window.getSelection();
		if (selection.rangeCount > 0) {
			const range = selection.getRangeAt(0);
			const preCaretRange = range.cloneRange();
			preCaretRange.selectNodeContents(Ref);
			preCaretRange.setEnd(range.startContainer, range.startOffset);
			const charIndex = preCaretRange.toString().length;

			cursorPosition.set(charIndex);

			console.log('Character index:', charIndex);
		}
	};

	Ref.addEventListener('keydown', onKeyDown);
	Ref.addEventListener('click', onClick);

	cleanup(() => {
		Ref.removeEventListener('keydown', onKeyDown);
		Ref.removeEventListener('click', onClick);
	});

	const Cursor = () => <div style={{
		borderLeft: '1px solid black',
		display: 'inline-block',
		height: '1em',
		position: 'relative',
		animation: 'blink 1s step-start infinite',
	}} />

	// There will only ever need to be a max of two spans, one before and another after the cursor.
	// Therefore we can use a simplified approach that

	const elements = OArray([value]);

	cursorPosition.effect(e => {
		// on each cursorPosition update, split the "value" where the index is
		const str = value.get()
		const first = str.slice(0, e);
		const second = str.slice(e);
		console.log('FIRST: ', first, '\nSECOND: ', second);

		/*
		basically:
		if first is empty string, cursor is at the start of the array
		if second string is empty string, cursor is at the end of the value
		if both have valid strings, cursor is in between.
		*/

		//

		if (first || second) {
			elements.splice(0, elements.length, [
				first,
				<Cursor />,
				second,
			]);
		}
	})


	return <Ref
		style={{
			cursor: 'text'
		}}
	>
		{elements}
	</Ref>;
};

// Example/test:
const value = Observer.mutable('Hello World!');

mount(document.body, <Theme value={theme.theme}>
	<Icons value={theme.icons}>
		<Text value={value} />
	</Icons>
</Theme>);
