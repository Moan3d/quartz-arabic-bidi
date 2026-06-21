import { QuartzTransformerPlugin } from '@quartz-community/types';

interface Options {
    /** Tags whose text is never processed and is forced dir="ltr" (§6.5) */
    ltrTags?: string[];
}
declare const ArabicBidi: QuartzTransformerPlugin<Options>;

export { ArabicBidi, type Options, ArabicBidi as default };
