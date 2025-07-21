import { Observer } from 'destam';
import { Theme, Shown, Typography } from 'destamatic-ui';

Theme.define({
	textField: {
		extends: 'typography_h1',
		cursor: 'text',
		position: 'relative',
		outline: 'none',
		whiteSpace: 'pre-wrap',
		color: 'white',
	},
	cursor: { // TODO:  some cool way to invert the colors of the contents beneath the cursor? Like in vscode?
		extends: 'radius',
		position: 'absolute',
		width: 8,
		background: 'white',
	},
	// TODO: Look into styling and themeing selected text??
})

/*
TextField is a fully custom, destamatic-ui, ground up text input component.

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

TODO:
- Add temp history, maybe we don't need network? Just an array with value.effect? for ctrl + z and ctrl + shift + z
- For larger history, cross lines, for something like an ide, let's assume some external
  network thing will work with value somehow.
- Select text - fix cursor to end at the end of a selection, right now this is broken
- Shift + arrow keys == select text, each arrow key press in either direction adds or subtracts from the selection like in a code editor.
*/

export const TextField = ({
	value,
	cursor = null,
	selection = { start: null, end: null },
	wrapperRef: WrapperRef = <raw:div />,
	valueRef: ValueRef = <raw:span />,
	cursorRef: CursorRef = <raw:div />,
	tabIndex = 0,
	...props
}, cleanup, mounted) => {
	if (!(cursor instanceof Observer)) cursor = Observer.mutable(cursor);
	if (!(selection instanceof Observer)) selection = Observer.mutable(selection);

	const isFocused = Observer.mutable(false);
	const lastMoved = Observer.mutable(Date.now());
	const timeToFirstBlink = 250; // Time in ms to wait before starting to blink
	const blinkInterval = 400; // Blink phase duration in ms

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
			const parentRect = WrapperRef.getBoundingClientRect();

			CursorRef.style.left = `${rect.left - parentRect.left}px`;
			CursorRef.style.top = `${rect.top - parentRect.top}px`;
			CursorRef.style.height = `${rect.height}px`;
		}
	};

	const selectionChange = () => {
		const sel = selection.get();
		const textNode = ValueRef.firstChild;
		if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;

		const range = document.createRange();
		range.setStart(textNode, Math.min(sel.start, textNode.length));
		range.setEnd(textNode, Math.min(sel.end, textNode.length));

		const windowSelection = window.getSelection();
		if (!windowSelection) return;

		windowSelection.removeAllRanges();
		windowSelection.addRange(range);
	};

	// possible bug: if the onMouseUp is outside the WrapperRef the cursor location isn't updated to finalIndex properly?
	const onMouseUp = (e) => {
		const sel = window.getSelection();
		if (!sel || sel.rangeCount === 0) return;

		const textNode = ValueRef.firstChild;

		if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;

		const anchorOffset = sel.anchorOffset;
		const focusOffset = sel.focusOffset;

		const start = Math.min(anchorOffset, focusOffset);
		const end = Math.max(anchorOffset, focusOffset);

		selection.set({ start, end });

		cursor.set(focusOffset);
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

	const findWordBoundary = (text, index, direction) => {
		let i = index;
		if (direction === 'left') {
			while (i > 0 && text[i - 1] === ' ') i--;
			while (i > 0 && text[i - 1] !== ' ') i--;
		} else if (direction === 'right') {
			while (i < text.length && text[i] === ' ') i++;
			while (i < text.length && text[i] !== ' ') i++;
		}
		return i;
	};

	const onKeyDown = async (e) => {
		if (!isFocused.get()) return;
		const curIndx = cursor.get();
		const curValue = value.get();
		const { start, end } = selection.get();
		const [minIndx, maxIndx] = [Math.min(start, end), Math.max(start, end)];

		// TODO: Ctrl + a selection disables default and only selects all text within value.
		switch (e.key) {
			case 'ArrowLeft':
				if (start != null || end != null) {
					selection.set({ start: null, end: null });
					cursor.set(Math.min(start, end));

				} else if (curIndx > 0) {
					const newIndex = e.ctrlKey
						? findWordBoundary(curValue, curIndx, 'left')
						: curIndx - 1;
					cursor.set(newIndex);
				}
				break;
			case 'ArrowRight':
				if (start != null || end != null) {
					selection.set({ start: null, end: null });
					cursor.set(Math.max(start, end));
				} else if (curIndx < curValue.length) {
					const newIndex = e.ctrlKey
						? findWordBoundary(curValue, curIndx, 'right')
						: curIndx + 1;
					cursor.set(newIndex);
				}
				break;

			case 'Backspace':
				if (start != null || end != null) {
					value.set(curValue.slice(0, minIndx) + curValue.slice(maxIndx));
					cursor.set(minIndx);
					selection.set({ start: null, end: null });
				} else if (curIndx > 0) {
					const start = e.ctrlKey
						? findWordBoundary(curValue, curIndx, 'left')
						: curIndx - 1;
					value.set(curValue.slice(0, start) + curValue.slice(curIndx));
					cursor.set(start);
				}
				break;
			case 'Delete':
				if (start != null || end != null) {
					value.set(curValue.slice(0, minIndx) + curValue.slice(maxIndx));
					cursor.set(minIndx);
					selection.set({ start: null, end: null });
				} else if (curIndx < curValue.length) {
					const end = e.ctrlKey
						? findWordBoundary(curValue, curIndx, 'right')
						: curIndx + 1;
					value.set(curValue.slice(0, curIndx) + curValue.slice(end));
				}
				break;
			case 'Enter':
				break;
			case 'Escape':
				selection.set({ start: null, end: null });
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

	const onFocus = () => isFocused.set(true);
	const onBlur = () => {
		isFocused.set(false);
		selection.set({ start: null, end: null });
		cursor.set(null);
	};

	WrapperRef.addEventListener('keydown', onKeyDown);
	WrapperRef.addEventListener('paste', onPaste);
	WrapperRef.addEventListener('mouseup', onMouseUp);
	WrapperRef.addEventListener('focus', onFocus, true);
	WrapperRef.addEventListener('blur', onBlur, true);

	cleanup(() => {
		WrapperRef.removeEventListener('keydown', onKeyDown);
		WrapperRef.removeEventListener('paste', onPaste);
		WrapperRef.removeEventListener('mouseup', onMouseUp);
		WrapperRef.removeEventListener('focus', onFocus, true);
		WrapperRef.removeEventListener('blur', onBlur, true);
	});

	mounted(() => {
		cleanup(cursor.effect(updateCursorPosition));

		// watch selection for user updates and apply to browser selection
		cleanup(selection.effect(selectionChange));

		queueMicrotask(selectionChange);
		queueMicrotask(updateCursorPosition); // for some reason on initial render, cursor position is rendered wrong if the user of the componnet passes in a cursor index. it's just slightly shifted so that means the calculations aren't being done on a fully rendered component maybe?
	})

	// TODO: onClick or onMouseDown outside of WrapperRef, run cursor.set(null); so that it wont appear anymore.
	// TODO: Fix multiple Text components on the same page with key downs. only have keydowns on WrapperRef not window?

	// Manually set tabindex so that focus/blur are enabled on WrapperRef. Let's us avoid having to manually pipe a custom focus/blur.
	return <WrapperRef theme='textField' role="textbox" tabindex={tabIndex} {...props}>
		{/* <ValueRef> */}
		{/* ValueRef is failing here for some reason, unable to set cursor position with weird elements beneath it. */}
		<Typography ref={ValueRef} label={value.map(v => Observer.mutable(v === '' ? '\u200B' : v)).unwrap()} />
		{/* {value.map(v => v === '' ? '\u200B' : v)} */}
		{/* </ValueRef> */}
		<Shown value={cursor.map(c => c !== null)}>
			<CursorRef theme='cursor' style={{
				opacity: Observer.timer(blinkInterval).map(() => {
					const delta = Date.now() - lastMoved.get();
					if (delta < timeToFirstBlink) return 1;
					return Math.floor((delta - timeToFirstBlink) / blinkInterval) % 2 === 0 ? 1 : 0
				})
			}} />
		</Shown>
	</WrapperRef>;
};

export default TextField;
