import { TransformableInfo } from 'logform';
import TransportStream from "winston-transport";

// enumeration to assign color values to
enum LevelColors {
    INFO = 'darkturquoise',
    WARN = 'khaki',
    ERROR = 'tomato',
}

// type levels used for setting color and shutting typescript up
type Levels = 'INFO' | 'WARN' | 'ERROR';

const defaultColor = 'color: inherit';

//! Overriding winston console transporter
export class Console extends TransportStream {
    constructor(options = {}) {
        super(options);

        this.setMaxListeners(30);
    }

    log(info: TransformableInfo, next: () => void) {
        // styles a console log statement accordingly to the log level
        // log level colors are taken from levelcolors enum
        console.log(
            `%c[%c${info.level.toUpperCase()}%c]:`,
            defaultColor,
            `color: ${LevelColors[info.level.toUpperCase() as Levels]};`,
            defaultColor,
            // message will be included after stylings
            // through this objects and arrays will be expandable
            info.message
        );

        // must call the next function here
        // or otherwise you'll only be able to send one message
        next();
    }
}
