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

/**
 * Insert "newLine" right after "line" in our doubly linked list,
 * linking neighbors accordingly.
 */
const insertAfter = (line, newLine) => {
	newLine.prev = line;
	newLine.next = line.next;
	if (line.next) {
		line.next.prev = newLine;
	}
	line.next = newLine;
};

/**
 * Remove "line" from the linked list and link neighbors around it.
 * Return whichever neighbor we should focus next, or null if none.
 */
const removeLine = (line) => {
	const { prev, next } = line;
	if (prev) prev.next = next;
	if (next) next.prev = prev;
	return prev || next || null;
}

/**
 * Re-number all lines in the array by iterating in order.
 * Because we do it once per insertion/deletion, we avoid
 * each line having its own index watcher.
 */
function renumberAll() {
	for (let i = 0; i < lines.length; i++) {
		lines[i].lineNumber = i + 1;
	}
}

const lines = OArray([
	createLine()
]);

const currentLine = Observer.mutable(lines[0]);

/**
 * Whenever any top-level operation modifies the lines array—
 * like splicing in/out lines—renumber them all in one pass.
 */
lines.observer.shallow(1).watch(renumberAll);

/**
 * A single line component. It no longer watches for array index changes.
 * Instead, it just displays the lineNumber property, which is re-assigned
 * centrally whenever the array changes.
 */
const Line = ({ each: line }) => {
	const focus = currentLine.map(cl => cl === line);

	return <div theme="row_spread" style={{ gap: 10 }}>
		<Typography type="p1" label={line.observer.path('lineNumber')} />
		<TextField
			theme='linefield'
			style={{ width: '100%' }}
			value={line.observer.path('value')}
			focus={focus}
		/>
	</div>;
};

/**
 * A raw wrapper that handles all relevant keyboard shortcuts:
 *  - Enter => Insert a new line below currentLine
 *  - Backspace => If current line is empty, remove it
 *  - ArrowUp => Move to .prev
 *  - ArrowDown => Move to .next
 */
const Wrapper = <raw:div />;
Wrapper.addEventListener('keydown', e => {
	const line = currentLine.get();

	switch (e.key) {
		case 'Enter': {
			const newLine = createLine('');
			insertAfter(line, newLine);

			const idx = lines.indexOf(line);
			if (idx >= 0) lines.splice(idx + 1, 0, newLine);
			else lines.push(newLine);

			currentLine.set(newLine);
			e.preventDefault();
			break;
		}

		case 'Backspace': {
			if (!line.value) {
				const nextFocus = removeLine(line);
				const idx = lines.indexOf(line);
				if (idx > 0) {
					lines.splice(idx, 1);
				}
				if (nextFocus) {
					currentLine.set(nextFocus);
				}
				e.preventDefault();
			}
			break;
		}

		case 'ArrowUp': {
			if (line.prev) {
				currentLine.set(line.prev);
				e.preventDefault();
			}
			break;
		}

		case 'ArrowDown': {
			if (line.next) {
				currentLine.set(line.next);
				e.preventDefault();
			}
			break;
		}
	}
});

mount(document.body,
	<Theme value={theme.theme}>
		<Icons value={theme.icons}>
			<Wrapper>
				<Line each={lines} />
			</Wrapper>
		</Icons>
	</Theme>
);
