import { Observer, OArray } from 'destam';
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
		position: 'absolute',
		width: 4,
		background: 'orange',
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
- Shift + arrow keys == select text, each arrow key press in either direction adds or subtracts from the selection like in a code editor.
- Handle text injection into the selection when selecting a none-text element injected by Typography modifier.


- Make cursor the same height as WrapperRef no matter the element size. it should never match the size of the element.
*/

export const TextField = ({
	value,
	selection = { start: null, end: null, side: null },
	wrapperRef: WrapperRef = <raw:div />,
	valueRef: ValueRef = <raw:span />,
	cursorRef: CursorRef = <raw:div />,
	tabIndex = 0,
	...props
}, cleanup, mounted) => {
	if (!(selection instanceof Observer)) selection = Observer.mutable(selection);

	const displayMap = OArray([]);
	/*
	if an element in display map is atomic=true, element will be treated as a single item:
	- no inner element text selection, no copying of element, or it's text content to the clipboard
	- cursor snaps to either side of the single atomic element, inner cursor index placement, through arrows or onMouseUp, will be reconciled to the left or right side of the element.

	if an element is atomic = true, or atomic is undefined, the element will be treated as such:
	- the original text, from value, that the element is converted to, is copyable and selectable.
	- cursor snaps to position within the element, in accordance to the textContent of the node, if textContent != the elements content in value, the element will be treated as atomic

	displayMap returns two types of items: atomic, and non-atomic. displayMap is a reconsilor, it helps us determine, modify, and set the cursor position regardless of the elements
	condition, normal text, atomic, non-atomic/fragment. This let's us include normal text, atomic elements, 

	atomic: atomic elements can be either single characters, simply from normal text. Or they can be an dom elements returned by a text modifier, that wishes to be treated as a single
	character.

	atomic displayMap entry: {
		index: int, // the start index of the element in Typography value.
		length: int, // the number of characters this element represents, remember this can either be a single character, or an atomic one due to text modifiers. 
		node: <>, // the node reference returned by the Typography modifier.
		displayId, // a unique displayMap entry identifier.
		...props, // other props passed in by modifiers.
	};

	non-atomic: non atomic elements are dom elements that have been fragmented so that their inner text act as if they were individual text characters in the text field. This allows for
	advanced styling while maintaining the functionality of normal text within the textField.

	non-atomic displayMap element fragment entry: {
		index: int, // the start index in the Typography value param the whole element starts at.
		node: <>, // the node reference returned by the typography modifier.
		displayId: hash, // a unique identifier, remians the same for all elements of the same non-atomic element.
		atomic: bool, // if false, indicator that this element is a non-atomic element.
		atomicIndex: int, index of this non-atomic element fragment within the string value passed to Typography.
		match: str, // the non-atomic element string the modifier was matched to.
		...props, // other props we can assign in modifiers, (not controlled in TextField).
	};

	a non atomic element is broken down into multiple entries into displayMap based on the text value it represents
	in the text modifier applied to it. The nodes textContent basically.

	After the displayMap is updated, we need a function that can take the current position of the cursor within displayMap and convert it into the actual position within the value string.
	This can be used to delete and add characters properly within the value string. All goes well this should be a solid system if not a bit messy.
	*/

	const isFocused = Observer.mutable(false);
	const lastMoved = Observer.mutable(Date.now());
	const timeToFirstBlink = 250; // Time in ms to wait before starting to blink
	const blinkInterval = 400; // Blink phase duration in ms

	const updateCursorPosition = () => {
		lastMoved.set(Date.now());
		const sel = selection.get();
		if (!sel) return;

		const { end, side } = sel;
		if (!end?.node) return;

		// A small BFS (or DFS) helper for finding a text node with content == matchText
		function findNodeWithMatchingText(root, matchText) {
			const queue = [root];
			while (queue.length) {
				const current = queue.shift();
				// Check if current is exactly a text node with matching contents
				if (current.nodeType === Node.TEXT_NODE && current.nodeValue === matchText) {
					return current;
				}
				// Otherwise enqueue children
				for (let i = 0; i < current.childNodes.length; i++) {
					queue.push(current.childNodes[i]);
				}
			}
			return null;
		}

		const wrapperRect = WrapperRef.getBoundingClientRect();
		const range = document.createRange();

		// offset is how far into the text we want to place the caret
		// e.g. offset = end.atomicIndex - end.index
		const offset = end.atomicIndex - end.index;

		if (end.atomic === false) {
			// Non-atomic: find the exact text node whose .nodeValue == end.match
			const textNode = findNodeWithMatchingText(end.node, end.match)
				?? end.node.firstChild
				?? end.node;

			if (!textNode) return;

			// Clamp offset if needed
			const textLength = textNode.nodeValue?.length ?? 0;
			const caretOffset = Math.max(0, Math.min(offset, textLength));

			try {
				range.setStart(textNode, caretOffset);
				range.setEnd(textNode, caretOffset);
			} catch (err) {
				// Fallback if offset is invalid
				range.selectNode(end.node);
			}

			const rects = range.getClientRects();
			if (!rects || rects.length === 0) {
				// fallback: use bounding box of entire node
				range.selectNode(end.node);
			}

			const finalRects = range.getClientRects();
			if (!finalRects || finalRects.length === 0) return;

			let rect = finalRects[0];
			let left = rect.left - wrapperRect.left;
			if (side === 'right') {
				left = rect.right - wrapperRect.left;
			}
			const top = rect.top - wrapperRect.top;

			CursorRef.style.left = `${left}px`;
			CursorRef.style.top = `${top}px`;
			CursorRef.style.height = `${rect.height}px`;
			CursorRef.style.opacity = '1';
		} else {
			// Atomic: measure the bounding box of the entire node
			range.selectNode(end.node);
			const rect = range.getBoundingClientRect();

			let left = rect.left - wrapperRect.left;
			let top = rect.top - wrapperRect.top;
			if (side === 'right') {
				left += rect.width;
			}

			CursorRef.style.left = `${left}px`;
			CursorRef.style.top = `${top}px`;
			CursorRef.style.height = `${rect.height}px`;
			CursorRef.style.opacity = '1';
		}
	};

	const findDisplayNode = (node) => {
		while (node && node !== WrapperRef) {
			if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute('displayId')) {
				return node;
			}
			node = node.parentNode;
		}
		return null;
	};

	const onMouseUp = (e) => {
		const sel = window.getSelection();
		if (!sel || sel.rangeCount === 0) return;

		const anchorNode = findDisplayNode(sel.anchorNode);
		const focusNode = findDisplayNode(sel.focusNode);

		const getEntry = (id) => displayMap.find(f => f.displayId === id);

		// Get the atomic fragment in displayMap if the element displayId is associated with a non-atomic element.
		const getFragment = (id, offset) => {
			const entry = getEntry(id);
			const textContent = entry.node.textContent;
			const match = entry.match;

			if (textContent !== match) {
				console.error('An atomic element must contain the exact text provided in the text modifier.')
				return entry; // fallback and just treat it like a normal atomic entry
			}

			const entries = displayMap.filter(f => f.displayId === id); // list of atomic fragments for given displayId non-atomic element.
			// find individual displayMap fragment entry and return it here.
			const matchedEntry = entries.find(f => offset === (f.atomicIndex - f.index));

			if (!matchedEntry) { // means that user selected right side of last character and index is on the next element in displayMap.
				// if no matchedEntry, return right most entry with largest atomicIndex.
				const largest = entries.reduce((max, current) =>
					max.atomicIndex > current.atomicIndex ? max : current, entries[0]);
				return displayMap.find(f => f.index == (largest.atomicIndex + 1));
			} else return matchedEntry;
		};

		let start;
		const startAtomic = anchorNode?.getAttribute('atomic');
		const startId = anchorNode.getAttribute('displayId');
		if (startAtomic === "false") start = getFragment(startId, sel.anchorOffset);
		else start = getEntry(startId);

		let end;
		const endAtomic = focusNode?.getAttribute('atomic');
		const endId = focusNode.getAttribute('displayId');
		console.log(focusNode, endAtomic, endId);
		if (endAtomic === "false") end = getFragment(endId, sel.focusOffset);
		else end = getEntry(endId);

		const rect = end.node.getBoundingClientRect();
		const mid = rect.left + rect.width / 2;
		const side = e.clientX < mid ? 'left' : 'right';

		selection.set({ start, end, side });
	};

	const onFocus = () => isFocused.set(true);
	const onBlur = () => {
		isFocused.set(false);
		selection.set({ start: null, end: null, side: null });
	};

	WrapperRef.addEventListener('mouseup', onMouseUp);
	WrapperRef.addEventListener('focus', onFocus, true);
	WrapperRef.addEventListener('blur', onBlur, true);

	cleanup(() => {
		WrapperRef.removeEventListener('mouseup', onMouseUp);
		WrapperRef.removeEventListener('focus', onFocus, true);
		WrapperRef.removeEventListener('blur', onBlur, true);
	});

	mounted(() => {
		cleanup(selection.effect(updateCursorPosition));
		queueMicrotask(updateCursorPosition);
	})

	return <WrapperRef theme='textField' role="textbox" tabindex={tabIndex} {...props}>
		<Typography
			displayMap={displayMap}
			ref={ValueRef}
			label={value.map(v => Observer.mutable(v === '' ? '\u200B' : v)).unwrap()}
		/>
		<Shown value={selection.map(c => c.end !== null || c.start !== null)}>
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
