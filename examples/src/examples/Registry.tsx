import { useState } from 'react';

import { ReactMinevo3D } from '../../../src/ReactMinevo3D';
import {
    type AnimationFn,
    createKeyframeAnimation,
    createWalkAnimation,
    createWaveAnimation,
} from '../../../src/minevo3d';
import { ExampleTemplate } from '../ExampleTemplate';

const REGISTRY = {
    dance: createKeyframeAnimation({
        duration: 1.2,
        ease: 'easeInOut',
        keyframes: [
            {
                time: 0,
                pose: {
                    armL: { out: 120, bend: 20 },
                    armR: { out: 30, bend: 10 },
                    torso: { roll: 6 },
                    position: { y: 0 },
                },
            },
            {
                time: 0.3,
                pose: {
                    armL: { out: 30, bend: 10 },
                    armR: { out: 120, bend: 20 },
                    torso: { roll: -6 },
                    position: { y: 1.5 },
                },
            },
            {
                time: 0.6,
                pose: {
                    armL: { out: 120, bend: 20 },
                    armR: { out: 30, bend: 10 },
                    torso: { roll: 6 },
                    position: { y: 0 },
                },
            },
            {
                time: 0.9,
                pose: {
                    armL: { out: 30, bend: 10 },
                    armR: { out: 120, bend: 20 },
                    torso: { roll: -6 },
                    position: { y: 1.5 },
                },
            },
        ],
    }),
    fastWalk: createWalkAnimation({ frequency: 1.4, legSwing: 40 }),
    waveLeft: createWaveAnimation({ side: 'L' }),
} satisfies Record<string, AnimationFn>;
type AnimationName = keyof typeof REGISTRY;
const ANIMATION_NAMES = Object.keys(REGISTRY) as AnimationName[];

const vanillaCode = `import { CharacterViewer, createKeyframeAnimation, createWalkAnimation, createWaveAnimation } from 'minevo3d';

const animations = {
    dance: createKeyframeAnimation({
        duration: 1.2,
        ease: 'easeInOut',
        keyframes: [
            { time: 0, pose: { armL: { out: 120, bend: 20 }, armR: { out: 30, bend: 10 }, torso: { roll: 6 } } },
            { time: 0.3, pose: { armL: { out: 30, bend: 10 }, armR: { out: 120, bend: 20 }, torso: { roll: -6 }, position: { y: 1.5 } } },
            { time: 0.6, pose: { armL: { out: 120, bend: 20 }, armR: { out: 30, bend: 10 }, torso: { roll: 6 } } },
            { time: 0.9, pose: { armL: { out: 30, bend: 10 }, armR: { out: 120, bend: 20 }, torso: { roll: -6 }, position: { y: 1.5 } } },
        ],
    }),
    fastWalk: createWalkAnimation({ frequency: 1.4, legSwing: 40 }),
    waveLeft: createWaveAnimation({ side: 'L' }),
};

const container = document.querySelector('#character');
if (!(container instanceof HTMLElement)) throw new Error('Character container not found');

const viewer = new CharacterViewer(container, { animations, animation: 'dance' });
document.querySelectorAll('[data-animation]').forEach((button) => {
    button.addEventListener('click', () => {
        const animation = button.getAttribute('data-animation');
        if (animation && animation in animations) viewer.play(animation as keyof typeof animations);
    });
});

viewer.dispose();`;

const reactCode = `import { useState } from 'react';
import { ReactMinevo3D, createKeyframeAnimation, createWalkAnimation, createWaveAnimation, type AnimationFn } from 'minevo3d/react';

const animations = {
    dance: createKeyframeAnimation({
        duration: 1.2,
        ease: 'easeInOut',
        keyframes: [
            { time: 0, pose: { armL: { out: 120, bend: 20 }, armR: { out: 30, bend: 10 }, torso: { roll: 6 } } },
            { time: 0.3, pose: { armL: { out: 30, bend: 10 }, armR: { out: 120, bend: 20 }, torso: { roll: -6 }, position: { y: 1.5 } } },
            { time: 0.6, pose: { armL: { out: 120, bend: 20 }, armR: { out: 30, bend: 10 }, torso: { roll: 6 } } },
            { time: 0.9, pose: { armL: { out: 30, bend: 10 }, armR: { out: 120, bend: 20 }, torso: { roll: -6 }, position: { y: 1.5 } } },
        ],
    }),
    fastWalk: createWalkAnimation({ frequency: 1.4, legSwing: 40 }),
    waveLeft: createWaveAnimation({ side: 'L' }),
} satisfies Record<string, AnimationFn>;

export function RegistryExample() {
    const [animation, setAnimation] = useState<keyof typeof animations>('dance');

    return (
        <>
            {Object.keys(animations).map(name => (
                <button key={name} onClick={() => setAnimation(name as keyof typeof animations)}>
                    {name}
                </button>
            ))}
            <div className='h-105 w-80'>
                <ReactMinevo3D animations={animations} animation={animation} />
            </div>
        </>
    );
}`;

export function Registry() {
    const [animation, setAnimation] = useState<AnimationName>('dance');

    return (
        <ExampleTemplate
            number={4}
            category='Animation'
            title='Animation registry'
            description='Register animations with names that are easy to select. This includes keyframe animations and animations created from a configuration.'
            vanillaCode={vanillaCode}
            reactCode={reactCode}
            preview={
                <div className='h-105 w-80'>
                    <ReactMinevo3D animations={REGISTRY} animation={animation} />
                </div>
            }
            controls={
                <>
                    <p>
                        Animation: <strong>{animation}</strong>
                    </p>
                    <div className='flex flex-wrap gap-2'>
                        {ANIMATION_NAMES.map(name => (
                            <button
                                key={name}
                                aria-pressed={animation === name}
                                onClick={() => setAnimation(name)}
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                </>
            }
        />
    );
}
