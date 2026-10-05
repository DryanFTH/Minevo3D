import { ReactMinevo3D } from '../../../src/ReactMinevo3D';
import { type AnimationFn, combineAnimations, walk } from '../../../src/minevo3d';
import { ExampleTemplate } from '../ExampleTemplate';

const nod: AnimationFn = ({ time, intensity }) => ({
    head: { pitch: Math.sin(time * 4) * 15 * intensity },
});
const walkAndNod = combineAnimations(walk, nod);

const vanillaCode = `import { CharacterViewer, combineAnimations, walk } from 'minevo3d';

const nod = ({ time, intensity }) => ({
    head: { pitch: Math.sin(time * 4) * 15 * intensity },
});
const walkAndNod = combineAnimations(walk, nod);

const container = document.querySelector('#character');
if (!(container instanceof HTMLElement)) throw new Error('Character container not found');

const viewer = new CharacterViewer(container, { animation: walkAndNod });

// Call this when the viewer element is removed.
viewer.dispose();`;

const reactCode = `import {
    combineAnimations,
    ReactMinevo3D,
    walk,
    type AnimationFn,
} from 'minevo3d/react';

const nod: AnimationFn = ({ time, intensity }) => ({
    head: { pitch: Math.sin(time * 4) * 15 * intensity },
});
const walkAndNod = combineAnimations(walk, nod);

export function CustomFunctionExample() {
    return (
        <div className='h-105 w-80'>
            <ReactMinevo3D animation={walkAndNod} />
        </div>
    );
}`;

export function CustomFunction() {
    return (
        <ExampleTemplate
            number={3}
            category='Animation'
            title='Custom animation'
            description='Create an animation function that returns a partial pose, then combine it with the built-in walking animation. Define the function outside the component so its identity stays stable.'
            vanillaCode={vanillaCode}
            reactCode={reactCode}
            preview={
                <div className='h-105 w-80'>
                    <ReactMinevo3D animation={walkAndNod} />
                </div>
            }
        />
    );
}
