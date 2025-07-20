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

*/

const Text = ({
	value, // need to somehow keep value incoming as a parameter observer for the user, but also allow for network history below.
	cursor = null,
	ref: Ref,
}, cleanup) => {
	if (!(cursor instanceof Observer)) cursor = Observer.mutable(cursor);
	if (!Ref) Ref = <raw:div />;

	const ValueRef = <raw:span />;
	const CursorRef = <raw:div />;

	const lastMoved = Observer.mutable(Date.now());
	const timeToFirstBlink = 250; // Time in ms to wait before starting to blink
	const blinkInterval = 400; // Blink phase duration in ms

	const history = OArray([]); // temp history state for ctrl + z (undo) and ctrl + shift + z (redo)
	const network = createNetwork(value);

	network.digest(() => {
		console.log("Changes here!!!", a, b, c, d);
		// const clientChanges = stringify(
		// 	changes,
		// 	{ observerRefs: observerRefs, observerNetwork: network }
		// );
		// await modReq('sync', { clientChanges: clientChanges })
	});

	history.observer.watch(e => {
		console.log("HISTORY: ", e);
	});

	value.watch(e => {
		console.log("VALUE: ", e);
	});

	const updateCursorPosition = () => {
		lastMoved.set(Date.now());

		const pos = cursor.get();

		const textNode = ValueRef.firstChild;
		if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;

		const range = document.createRange();
		range.setStart(textNode, Math.min(pos, textNode.length));
		range.setEnd(textNode, Math.min(pos, textNode.length));

		const rects = range.getClientRects();
		if (rects.length > 0); {
			const rect = rects[0];
			const parentRect = Ref.getBoundingClientRect();

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

		cursor.set(charIndex);
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

	// stub:
	const onKeyDown = async (e) => {
		const curIndx = cursor.get();
		const curValue = value.get();
		console.log(e.key);

		switch (e.key) {
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

	window.addEventListener('keydown', onKeyDown);
	Ref.addEventListener('click', onClick);
	Ref.addEventListener('paste', onPaste);

	cleanup(() => {
		window.removeEventListener('keydown', onKeyDown);
		Ref.removeEventListener('click', onClick);
		Ref.removeEventListener('paste', onPaste);
	});

	cleanup(cursor.effect(updateCursorPosition));

	if (cursor.get() && typeof cursor.get() === 'number') {
		queueMicrotask(updateCursorPosition);
	}

	console.log(value);

	return <Ref theme='textField'>
		<ValueRef >
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
	</Ref>;
};

// Example/test:
const value = Observer.mutable('Hello World!');

mount(document.body, <Theme value={theme.theme}>
	<Icons value={theme.icons}>
		<Text value={value} />
	</Icons>
</Theme>);
