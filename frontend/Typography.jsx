// A modification of the Typography component in destamatic-ui to support modifiers.

// would be cool if we use context so that different modifiers could be applied to different contexts.


import { createContext } from 'destamatic-ui';


export const TextModifiers = createContext(() => null, (value) => {

    return value;
});

// should operate with or without TypographyContext.
export const Typography = TextModifiers.use(t => ({
    type = 'h1',
    label = '',
    children,
    onClick,
    ...props
}) => {
    console.log('modifiers: ', t);
    const display = children.length > 0 ? children : label ? label : null;
    if (!display) console.error('Typography component initialized without child or label to display.');

    return <span
        {...props}
        theme={['typography', ...Array.isArray(type) ? type : type.split('_')]}
    >
        {display}
    </span>;
})
