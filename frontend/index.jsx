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
	const cursorPosition = Observer.mutable(0);

	if (!Ref) Ref = <raw:div />;
	const ValueRef = <raw:span />;
	const CursorRef = <raw:div />;

	const updateCursorPosition = () => {
		const str = value.get();
		const pos = cursorPosition.get();

		const textNode = ValueRef.firstChild;
		if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;

		const range = document.createRange();
		range.setStart(textNode, Math.min(pos, str.length));
		range.setEnd(textNode, Math.min(pos, str.length));

		const rects = range.getClientRects();
		if (rects.length > 0) {
			const rect = rects[0];
			const parentRect = Ref.getBoundingClientRect();

			// Absolute positioning inside parent
			CursorRef.style.left = `${rect.left - parentRect.left}px`;
			CursorRef.style.top = `${rect.top - parentRect.top}px`;
			CursorRef.style.height = `${rect.height}px`;
		}
	};

	const onClick = (e) => {
		const selection = window.getSelection();
		if (!selection.rangeCount) return;

		const range = selection.getRangeAt(0);
		const preCaretRange = range.cloneRange();
		preCaretRange.selectNodeContents(ValueRef);
		preCaretRange.setEnd(range.startContainer, range.startOffset);
		const charIndex = preCaretRange.toString().length;

		cursorPosition.set(charIndex);
	};

	// stub:
	const onKeyDown = (e) => {
		e.preventDefault();
		switch (e.key) {
			case 'ArrowLeft':
				break;
			case 'ArrowRight':
				break;
			case 'Backspace':
				break;
			case 'Enter':
				break;
			default:
				break;
		}
	};

	Ref.addEventListener('keydown', onKeyDown);
	Ref.addEventListener('click', onClick);

	cleanup(() => {
		Ref.removeEventListener('keydown', onKeyDown);
		Ref.removeEventListener('click', onClick);
	});

	cursorPosition.effect(updateCursorPosition);

	return <Ref theme='typography' style={{
		cursor: 'text',
		position: 'relative',
		outline: 'none',
		whiteSpace: 'pre-wrap',
	}}>
		<ValueRef children={[value]} />
		<CursorRef style={{
			opacity: Observer.timer(1000).map(t => t % 2 === 0 ? 0 : 1), // somehow disable if a recent change in the cursor position so that it's visibile directly after click?
			position: 'absolute',
			width: '1px',
			background: 'black',
		}} />
	</Ref>;
};

// Example/test:
const value = Observer.mutable('Hello World!');

mount(document.body, <Theme value={theme.theme}>
	<Icons value={theme.icons}>
		<Text value={value} />
	</Icons>
</Theme>);
