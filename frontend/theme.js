import { atomic } from 'destam/Network';
import { OObject } from 'destam-dom';
import SimpleIcons from "destamatic-ui/components/icons/SimpleIcons";
import FeatherIcons from "destamatic-ui/components/icons/FeatherIcons";

const transition = '250ms ease-in-out';

const theme = OObject({
    '*': OObject({
        // _fontFace_IBMPlexSansNormal: {
        // 	fontFamily: 'IBM Plex Sans',
        // 	fontStyle: 'normal',
        // 	fontWeight: '100 700',
        // 	fontStretch: '100%',
        // 	fontDisplay: 'swap',
        // 	src: "url('/IBM_Plex_Sans/IBMPlexSans-VariableFont_wdth,wght.ttf') format('truetype')"
        // },
        // _fontFace_IBMPlexSansItalic: {
        // 	fontFamily: 'IBM Plex Sans',
        // 	fontStyle: 'italic',
        // 	fontWeight: '100 700',
        // 	fontStretch: '100%',
        // 	fontDisplay: 'swap',
        // 	src: "url('/IBM_Plex_Sans/IBMPlexSans-Italic-VariableFont_wdth,wght.ttf') format('truetype')"
        // },
        fontFamily: 'IBM Plex Sans',
        fontWeight: 600,
        boxSizing: 'border-box',
        transition: `opacity ${transition}, box-shadow ${transition}, background-color ${transition}, color ${transition}, border-color ${transition}, stroke ${transition}, fill ${transition}`,
    }),

    // primary: {
    //     $color: '$color_main',
    //     $color_text: '$contrast_text($color_main)',
    //     $color_top: '$contrast_text($color_main)',
    //     $color_hover: '$saturate($shiftBrightness($color_main, -.3), -.3)',
    // },
});

export default {
    theme,
    icons: [
        FeatherIcons,
        SimpleIcons
    ],
    define: (...args) => atomic(() => {
        let prefix = '';
        let i = 0;

        for (; i < args.length; i++) {
            if (typeof args[i] === 'string') {
                prefix += args[i] + '_';
            } else {
                break;
            }
        }

        const obj = args[i];
        for (const o in obj) {
            let name;
            if (o === '*') {
                name = prefix.substring(0, prefix.length - 1);
            } else {
                name = prefix + o;
            }

            if (name in theme) throw new Error('Theme.define: theme definition already exists: ' + o);
            theme[name] = obj[o];
        }
    }),
};
