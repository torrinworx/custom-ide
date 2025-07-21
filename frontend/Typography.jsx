// A modification of the Typography component in destamatic-ui to support modifiers.

// would be cool if we use context so that different modifiers could be applied to different contexts.


import { createContext } from 'destamatic-ui';


export const TextModifiers = createContext(() => null, (value) => {

    return value;
});

/*
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

const applyModifiers = (label, modifiers) => {
    if (!label) return [];

    let result = [];
    let cursor = 0;
    let matches = [];

    // Normalize modifiers to regex
    modifiers.forEach((mod, i) => {
        const pattern = typeof mod.check === 'string'
            ? new RegExp(mod.check.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
            : mod.check;

        let match;
        while ((match = pattern.exec(label)) !== null) {
            matches.push({
                start: match.index,
                end: match.index + match[0].length,
                match: match[0],
                mod,
                order: i,
            });
        }
    });

    // Sort by start index, then modifier order
    matches.sort((a, b) => a.start - b.start || a.order - b.order);

    // Remove overlaps (prioritize earlier modifiers)
    const filtered = [];
    let lastEnd = 0;
    for (const m of matches) {
        if (m.start >= lastEnd) {
            filtered.push(m);
            lastEnd = m.end;
        }
    }

    for (let i = 0; i <= filtered.length; i++) {
        const prev = filtered[i - 1];
        const next = filtered[i];

        const textBefore = label.slice(cursor, next ? next.start : label.length);
        if (textBefore) {
            result.push(<span key={`text-${cursor}`}>{textBefore}</span>);
        }

        if (next) {
            const rendered = next?.mod?.return?.(next.match);
            if (rendered != null) result.push(rendered);
            cursor = next.end;
        }
    }

    console.log(result)
    return result;
};

// should operate with or without TypographyContext.
export const Typography = TextModifiers.use(modifiers => ({
    type = 'h1',
    label = '',
    ref: Ref = <raw:div />,
    ...props
}) => {
    // ENSURE: We don't want applymodifiers running if at all for efficiency if there aren't any modifiers.
    const parts = label.map(l => applyModifiers(l, modifiers || []));

    return <Ref
        {...props}
        theme={['row', 'typography', ...Array.isArray(type) ? type : type.split('_')]}
    >
        {parts}
    </Ref>;
});
