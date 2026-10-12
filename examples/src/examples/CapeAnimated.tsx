import { ReactMinevo3D } from '../../../src/ReactMinevo3D';
import { type AnimationFn, combineAnimations, idle } from '../../../src/minevo3d';
import { ExampleTemplate } from '../ExampleTemplate';

const flutter: AnimationFn = ({ time, intensity }) => ({
    cape: {
        swing: 20 + Math.sin(time * 3) * 12 * intensity,
        bend: 15,
        sway: Math.sin(time * 1.7) * 10 * intensity,
    },
});
const animation = combineAnimations(idle, flutter);

const vanillaCode = `import { CharacterViewer, combineAnimations, idle } from 'minevo3d';

const container = document.querySelector('#character');
if (!(container instanceof HTMLElement)) throw new Error('Character container not found');

const viewer = new CharacterViewer(container, {
    animation: combineAnimations(idle, ({ time, intensity }) => ({
        cape: {
            swing: 20 + Math.sin(time * 3) * 12 * intensity,
            bend: 15,
            sway: Math.sin(time * 1.7) * 10 * intensity,
        },
    })),
    cape: true,
});

viewer.dispose();`;

const reactCode = `import {
    combineAnimations,
    idle,
    type AnimationFn,
    ReactMinevo3D,
} from 'minevo3d/react';

const flutter: AnimationFn = ({ time, intensity }) => ({
    cape: {
        swing: 20 + Math.sin(time * 3) * 12 * intensity,
        bend: 15,
        sway: Math.sin(time * 1.7) * 10 * intensity,
    },
});

export function CapeAnimatedExample() {
    return (
        <div className='h-105 w-80'>
            <ReactMinevo3D animation={combineAnimations(idle, flutter)} cape />
        </div>
    );
}`;

export function CapeAnimated() {
    return (
        <ExampleTemplate
            number={21}
            category='Skins & capes'
            title='Cape follows the animation'
            description='Combine the idle animation with a custom animation function that moves the cape using the swing, bend, and sway channels.'
            vanillaCode={vanillaCode}
            reactCode={reactCode}
            preview={
                <div className='h-105 w-80'>
                    <ReactMinevo3D animation={animation} cape />
                </div>
            }
        />
    );
}
