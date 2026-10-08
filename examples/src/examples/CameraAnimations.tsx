import { useRef, useState } from 'react';

import { ReactMinevo3D, type ReactMinevo3DHandle } from '../../../src/ReactMinevo3D';
import {
    type AnimationFn,
    combineAnimations,
    createCameraKeyframeAnimation,
    createCameraShake,
    createDollyZoomAnimation,
    idle,
} from '../../../src/minevo3d';
import { ExampleTemplate } from '../ExampleTemplate';

const introCamera = createCameraKeyframeAnimation({
    duration: 3.5,
    loop: false,
    ease: 'easeInOut',
    keyframes: [
        { time: 0, camera: { zoom: 0.6, fov: 15 } },
        { time: 1.5, camera: { zoom: 3, fov: 0, target: { y: 12 } } },
        { time: 3.5, camera: { zoom: 1, target: { y: 0 } } },
    ],
});
const introScene = combineAnimations(idle, introCamera);
const dollyScene = combineAnimations(
    idle,
    createDollyZoomAnimation({ to: 90, duration: 2.5, yoyo: true, loop: true }),
);
const quakeScene = combineAnimations(
    idle,
    createCameraShake({ amplitude: 2, duration: 1.2 }),
);

const vanillaCode = `import {
    CharacterViewer,
    combineAnimations,
    createCameraKeyframeAnimation,
    createCameraShake,
    createDollyZoomAnimation,
    idle,
} from 'minevo3d';

const container = document.querySelector('#character');
if (!(container instanceof HTMLElement)) throw new Error('Character container not found');

const intro = combineAnimations(idle, createCameraKeyframeAnimation({
    duration: 3.5,
    loop: false,
    ease: 'easeInOut',
    keyframes: [
        { time: 0, camera: { zoom: 0.6, fov: 15 } },
        { time: 1.5, camera: { zoom: 3, fov: 0, target: { y: 12 } } },
        { time: 3.5, camera: { zoom: 1, target: { y: 0 } } },
    ],
}));
const dolly = combineAnimations(idle, createDollyZoomAnimation({ to: 90, duration: 2.5, yoyo: true, loop: true }));
const quake = combineAnimations(idle, createCameraShake({ amplitude: 2, duration: 1.2 }));
const viewer = new CharacterViewer(container, { animation: intro, controls: { zoom: true } });

document.querySelector('#intro')?.addEventListener('click', () => viewer.play(intro));
document.querySelector('#dolly')?.addEventListener('click', () => viewer.play(dolly));
document.querySelector('#quake')?.addEventListener('click', () => viewer.play(quake));

viewer.dispose();`;

const reactCode = `import { useRef, useState } from 'react';
import {
    combineAnimations,
    createCameraKeyframeAnimation,
    createCameraShake,
    createDollyZoomAnimation,
    idle,
    type AnimationFn,
    ReactMinevo3D,
    type ReactMinevo3DHandle,
} from 'minevo3d/react';

const intro = combineAnimations(idle, createCameraKeyframeAnimation({
    duration: 3.5,
    loop: false,
    ease: 'easeInOut',
    keyframes: [
        { time: 0, camera: { zoom: 0.6, fov: 15 } },
        { time: 1.5, camera: { zoom: 3, fov: 0, target: { y: 12 } } },
        { time: 3.5, camera: { zoom: 1, target: { y: 0 } } },
    ],
}));
const dolly = combineAnimations(idle, createDollyZoomAnimation({ to: 90, duration: 2.5, yoyo: true, loop: true }));
const quake = combineAnimations(idle, createCameraShake({ amplitude: 2, duration: 1.2 }));

export function CameraAnimationsExample() {
    const viewerRef = useRef<ReactMinevo3DHandle>(null);
    const [animation, setAnimation] = useState<AnimationFn>(() => intro);
    const [animationKey, setAnimationKey] = useState(0);
    const play = (nextAnimation: AnimationFn) => {
        setAnimation(() => nextAnimation);
        setAnimationKey(key => key + 1);
    };

    return (
        <>
            <button onClick={() => play(intro)}>Intro (keyframe)</button>
            <button onClick={() => play(dolly)}>Dolly zoom</button>
            <button onClick={() => play(quake)}>Camera shake</button>
            <button onClick={async () => {
                const finished = await viewerRef.current?.animateCamera(
                    { zoom: 3, target: [0, 28, 0] },
                    { duration: 1, ease: 'easeInOut' },
                );
                if (finished) await viewerRef.current?.resetCamera({ duration: 1 });
            }}>Zoom in and return</button>
            <div className='h-115 w-90'>
                <ReactMinevo3D ref={viewerRef} animation={animation} animationKey={animationKey} controls={{ zoom: true }} />
            </div>
        </>
    );
}`;

export function CameraAnimations() {
    const viewerRef = useRef<ReactMinevo3DHandle>(null);
    const [animation, setAnimation] = useState<AnimationFn>(() => introScene);
    const [animationKey, setAnimationKey] = useState(0);
    const play = (nextAnimation: AnimationFn) => {
        setAnimation(() => nextAnimation);
        setAnimationKey(key => key + 1);
    };

    return (
        <ExampleTemplate
            number={11}
            category='Camera'
            title='Camera animations'
            description='Try a keyframe intro, dolly zoom, camera shake, and an imperative tween that zooms in and returns to the starting position.'
            vanillaCode={vanillaCode}
            reactCode={reactCode}
            preview={
                <div className='h-115 w-90'>
                    <ReactMinevo3D
                        ref={viewerRef}
                        animation={animation}
                        animationKey={animationKey}
                        controls={{ zoom: true }}
                    />
                </div>
            }
            controls={
                <>
                    <button onClick={() => play(introScene)}>Intro (keyframe)</button>
                    <button onClick={() => play(dollyScene)}>Dolly zoom</button>
                    <button onClick={() => play(quakeScene)}>Camera shake</button>
                    <button
                        onClick={async () => {
                            const finished = await viewerRef.current?.animateCamera(
                                { zoom: 3, target: [0, 28, 0] },
                                { duration: 1, ease: 'easeInOut' },
                            );
                            if (finished)
                                await viewerRef.current?.resetCamera({ duration: 1 });
                        }}
                    >
                        Zoom in and return
                    </button>
                </>
            }
        />
    );
}
