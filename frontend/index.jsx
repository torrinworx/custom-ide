import { mount } from 'destam-dom';
import { OObject, Observer, UUID } from 'destam';
import { Theme, Icons, Shown } from 'destamatic-ui';

import theme from './theme.js';

Theme.define({
	textField: {
		extends: 'typography_h1',
		cursor: 'text',
		position: 'relative',
		outline: 'none',
		whiteSpace: 'pre-wrap',
	},
	cursor: {
		position: 'absolute',
		width: '4px',
		background: 'black',
	}
})

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
	const lastMoved = Observer.mutable(Date.now());
	const timeToFirstBlink = 250; // Time in ms to wait before starting to blink
	const blinkInterval = 400; // Blink phase duration in ms
	const cursorPosition = Observer.mutable(null);

	if (!Ref) Ref = <raw:div />;
	const ValueRef = <raw:span />;
	const CursorRef = <raw:div />;

	const updateCursorPosition = () => {
		lastMoved.set(Date.now());

		const str = value.get();
		const pos = cursorPosition.get();

		const textNode = ValueRef.firstChild;
		if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;

		const range = document.createRange();
		range.setStart(textNode, Math.min(pos, str.length));
		range.setEnd(textNode, Math.min(pos, str.length));

		const rects = range.getClientRects();
		if (rects.length > 0); {
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

		const range = selection.getRangeAt(0);;
		const preCaretRange = range.cloneRange();
		preCaretRange.selectNodeContents(ValueRef);
		preCaretRange.setEnd(range.startContainer, range.startOffset);
		const charIndex = preCaretRange.toString().length;

		cursorPosition.set(charIndex);
	};

	// stub:
	const onKeyDown = (e) => {
		// e.preventDefault();
		const curIndx = cursorPosition.get();
		const curValue = value.get();

		console.log(e);
		switch (e.key) {
			case 'ArrowLeft':
				if (curIndx > 0) {
					cursorPosition.set(curIndx - 1);
				}
				break;
			case 'ArrowRight':
				if (curIndx < curValue.length) {
					cursorPosition.set(curIndx + 1);
				}
				break;
			case 'Backspace':
				if (curIndx > 0) {
					value.set(curValue.slice(0, curIndx - 1) + curValue.slice(curIndx));
					cursorPosition.set(curIndx - 1);
				}
				break;
			case 'Delete':
				if (curIndx < curValue.length) {
					value.set(curValue.slice(0, curIndx) + curValue.slice(curIndx + 1));
				}
				break;
			case 'Enter':
				break;
			default:
				if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
					value.set(curValue.slice(0, curIndx) + e.key + curValue.slice(curIndx));
					cursorPosition.set(curIndx + 1);
				}
				break;
		}
	};

	window.addEventListener('keydown', onKeyDown);
	Ref.addEventListener('click', onClick);

	cleanup(() => {
		Ref.removeEventListener('keydown', onKeyDown);
		Ref.removeEventListener('click', onClick);
	});

	cleanup(cursorPosition.effect(updateCursorPosition));

	return <Ref theme='textField'>
		<ValueRef children={[value]} />
		<Shown value={cursorPosition.map(c => c >= 0)}>
			<CursorRef theme='cursor' style={{
				opacity: Observer.timer(100).map(() => {
					const delta = Date.now() - lastMoved.get();
					if (delta < timeToFirstBlink) return 1;
					return Math.floor((delta - timeToFirstBlink) / blinkInterval) % 2 === 0 ? 1 : 0
				})
			}} />
		</Shown>
	</Ref>;
};

// Example/test:
const value = Observer.mutable('Hello World!');

mount(document.body, <Theme value={theme.theme}>
	<Icons value={theme.icons}>
		<Text value={value} />
	</Icons>
</Theme>);
