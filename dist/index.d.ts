import { QuartzTransformerPlugin } from '@quartz-community/types';

interface Options {
    ltrTags?: string[];
}
declare const ArabicBidi: QuartzTransformerPlugin<Options>;

export { ArabicBidi, type Options, ArabicBidi as default };
