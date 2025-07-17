import { mount, Observer } from 'destam-dom';
import { TextArea } from 'destamatic-ui';

const value = Observer.mutable('test');
mount(document.body, <div>
    hello world
    <TextArea value={value} />
</div>);
