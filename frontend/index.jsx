import { mount } from 'destam-dom';
import { OArray, OObject, Observer, UUID, createNetwork } from 'destam';
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
	cursor: { // some cool way to invert the colors of the contents beneath the cursor? Like in vscode?
		extends: 'radius',
		position: 'absolute',
		width: 8,
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


Idea: modifier system that uses regex? If string == "hello world", automatically splice that out
before rendering it. and modify it according to the users modifiers?
const modifiers = [
	(value) => {
		if (value.get() === 'hello world') {
			return <div style={{ color: 'red' }}>HELLO WORLD</div>
		}
	}
];

allows for regex? which could mean easier integration with https://highlightjs.org/ or something like that? idk.
would be cool

could also allow for links and inline popups easily:
const modifiers = [
	(value) => {
		if (value.get() === 'hello world') {
			return <Button onClick={() => console.log('hello world')} >HELLO WORLD</Button>
		}
	}
];

then the result of the modifier is returned and rendered. I'm confused on the best way to do this though.

because the above is computationally wastful.

Maybe something like this:

const modifiers = [
	{
		check: /^hello world$/, // could be regex, or string to auto compare to.
		return: () => {
			return <Button onClick={() => console.log('hello world')} >HELLO WORLD</Button>
		}
	}
];

then below we do: 
value.effect(e => {
	for i in modifiers {
		if (e === i.check) { // contains this? Idk how to find the exact string inside this (e) string
			// slice value into two separate spans, before and after the regex match
			// i.return is then rendered between those two spans. 
		}
	}
})

TODO:
- Add temp history, maybe we don't need network? Just an array with value.effect? for ctrl + z and ctrl + shift + z
- For larger history, cross lines, for something like an ide, let's assume some external
  network thing will work with value somehow.
- Select text - fix cursor to end at the end of a selection, right now this is broken
- Shift + arrow keys == select text, each arrow key press in either direction adds or subtracts from the selection like in a code editor.
*/

const Text = ({
	value,
	cursor = null,
	selection = { start: 0, end: null },
	wrapperRef: WrapperRef = <raw:div />,
	valueRef: ValueRef = <raw:span />,
	cursorRef: CursorRef = <raw:div />
}, cleanup) => {
	if (!(cursor instanceof Observer)) cursor = Observer.mutable(cursor);
	if (!(selection instanceof Observer)) selection = Observer.mutable(selection);

	const mouseUp = Observer.mutable(false);
	const lastMoved = Observer.mutable(Date.now());
	const timeToFirstBlink = 250; // Time in ms to wait before starting to blink
	const blinkInterval = 400; // Blink phase duration in ms

	const updateCursorPosition = (pos) => {
		console.log(pos);
		lastMoved.set(Date.now());

		const textNode = ValueRef.firstChild;
		if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;

		const range = document.createRange();
		range.setStart(textNode, Math.min(pos, textNode.length));
		range.setEnd(textNode, Math.min(pos, textNode.length));

		const rects = range.getClientRects();
		if (rects.length > 0); {
			const rect = rects[0];
			const parentRect = WrapperRef.getBoundingClientRect();

			CursorRef.style.left = `${rect.left - parentRect.left}px`;
			CursorRef.style.top = `${rect.top - parentRect.top}px`;
			CursorRef.style.height = `${rect.height}px`;
		}
	};

	const getCursorPos = (e) => {
		const selection = window.getSelection();
		if (!selection.rangeCount) return null;

		const range = selection.getRangeAt(0);
		const preCaretRange = range.cloneRange();
		preCaretRange.selectNodeContents(ValueRef);
		preCaretRange.setEnd(range.startContainer, range.startOffset);
		return preCaretRange.toString().length;
	};

	const onClick = (e) => {
		if (!mouseUp) {
			const charIndex = getCursorPos(e);
			if (charIndex !== null) {
				cursor.set(charIndex);
			}
		}
	};

	const onMouseUp = (e) => {
		mouseUp.set(true);
		const selection = window.getSelection();
		if (!selection.rangeCount) return;

		const range = selection.getRangeAt(0);

		const preCaretRange = range.cloneRange();
		preCaretRange.selectNodeContents(ValueRef);
		preCaretRange.setEnd(range.startContainer, range.startOffset);
		const startIndex = preCaretRange.toString().length;

		const postCaretRange = range.cloneRange();
		postCaretRange.selectNodeContents(ValueRef);
		postCaretRange.setEnd(range.endContainer, range.endOffset);
		const endIndex = postCaretRange.toString().length;

		// Check if the selection was made from start-to-end or end-to-start
		// And select the focus position as the endpoint of the selection.
		let finalIndex;
		if (selection.anchorOffset < selection.focusOffset) {
			finalIndex = endIndex; // Selection was made from start to end
		} else {
			finalIndex = startIndex; // Selection was made from end to start
		}

		cursor.set(finalIndex);
		mouseUp.set(false);
	};


	const onPaste = (e) => {
		e.preventDefault();
		const pasteText = e.clipboardData.getData('text/plain');
		const curIndx = cursor.get();
		const curValue = value.get();

		const newValue = curValue.slice(0, curIndx) + pasteText + curValue.slice(curIndx);
		value.set(newValue);
		cursor.set(curIndx + pasteText.length);
	};

	const findWordBoundaryLeft = (text, index) => {
		let i = index;
		while (i > 0 && text[i - 1] === ' ') i--;
		while (i > 0 && text[i - 1] !== ' ') i--;
		return i;
	};

	const findWordBoundaryRight = (text, index) => {
		let i = index;
		while (i < text.length && text[i] === ' ') i++;
		while (i < text.length && text[i] !== ' ') i++;
		return i;
	};

	const onKeyDown = async (e) => {
		const curIndx = cursor.get();
		const curValue = value.get();

		switch (e.key) {

			// TODO: Add support for esc button to cancel selection.
			case 'ArrowLeft':
				if (curIndx > 0) {
					const newIndex = e.ctrlKey
						? findWordBoundaryLeft(curValue, curIndx)
						: curIndx - 1;
					cursor.set(newIndex);
				}
				break;
			case 'ArrowRight':
				if (curIndx < curValue.length) {
					const newIndex = e.ctrlKey
						? findWordBoundaryRight(curValue, curIndx)
						: curIndx + 1;
					cursor.set(newIndex);
				}
				break;

			// TODO: For Delete and Backspace: if text is currently selected, and backspace/delete pressed, remove that text from value.
			case 'Backspace':
				if (curIndx > 0) {
					const start = e.ctrlKey
						? findWordBoundaryLeft(curValue, curIndx)
						: curIndx - 1;
					value.set(curValue.slice(0, start) + curValue.slice(curIndx));
					cursor.set(start);
				}
				break;
			case 'Delete':
				if (curIndx < curValue.length) {
					const end = e.ctrlKey
						? findWordBoundaryRight(curValue, curIndx)
						: curIndx + 1;
					value.set(curValue.slice(0, curIndx) + curValue.slice(end));
				}
				break;
			case 'Enter':
				break;
			default:
				if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
					value.set(curValue.slice(0, curIndx) + e.key + curValue.slice(curIndx));
					cursor.set(curIndx + 1);
				}
				break;
		}
	};

	// TODO: On mouse up, after a selection, move the cursor to where the user has finished selecting, the oposite of the initial onMouseDown cursor.get() value somehow?

	window.addEventListener('keydown', onKeyDown);
	WrapperRef.addEventListener('click', onClick);
	WrapperRef.addEventListener('paste', onPaste);
	WrapperRef.addEventListener('mouseup', onMouseUp);

	cleanup(() => {
		window.removeEventListener('keydown', onKeyDown);
		WrapperRef.removeEventListener('click', onClick);
		WrapperRef.removeEventListener('paste', onPaste);
		WrapperRef.removeEventListener('mouseup', onMouseUp);
	});

	cleanup(cursor.effect(updateCursorPosition));

	if (cursor.get() && typeof cursor.get() === 'number') {
		queueMicrotask(updateCursorPosition);
	}

	return <WrapperRef theme='textField' role="textbox">
		<ValueRef>
			{value.map(v => v === '' ? '\u200B' : v)}
		</ValueRef>
		<Shown value={cursor.map(p => p !== null)}>
			<CursorRef theme='cursor' style={{
				opacity: Observer.timer(100).map(() => {
					const delta = Date.now() - lastMoved.get();
					if (delta < timeToFirstBlink) return 1;
					return Math.floor((delta - timeToFirstBlink) / blinkInterval) % 2 === 0 ? 1 : 0
				})
			}} />
		</Shown>
	</WrapperRef>;
};

// Example/test:
const value = Observer.mutable('Hello World!');

mount(document.body, <Theme value={theme.theme}>
	<Icons value={theme.icons}>
		<Text value={value} />
	</Icons>
</Theme>);
