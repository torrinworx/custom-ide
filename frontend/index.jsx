import { mount } from 'destam-dom';
import { Theme, Icons, PopupContext } from 'destamatic-ui';

import theme from './theme';

mount(document.body, <Theme value={theme.theme}>
	<Icons value={theme.icons}>
		<PopupContext>
			hello world
		</PopupContext>
	</Icons>
</Theme>);
