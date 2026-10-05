import { useState } from 'react';

import { ReactMinevo3D } from '../../../src/ReactMinevo3D';
import { ExampleTemplate } from '../ExampleTemplate';

const ANIMATIONS = ['idle', 'walk', 'run', 'float', 'wave', 'sit'] as const;
type Animation = (typeof ANIMATIONS)[number];

const vanillaCode = `import { CharacterViewer } from 'minevo3d';

const container = document.querySelector('#character');
if (!(container instanceof HTMLElement)) throw new Error('Character container not found');

const viewer = new CharacterViewer(container, {
    animation: 'walk',
    animationSpeed: 1,
});

document.querySelectorAll('[data-animation]').forEach((button) => {
    button.addEventListener('click', () => {
        const animation = button.getAttribute('data-animation');
        if (animation) viewer.play(animation, { transition: 0.3 });
    });
});

// Call this when the viewer element is removed.
viewer.dispose();`;

const reactCode = `import { useState } from 'react';
import { ReactMinevo3D } from 'minevo3d/react';

export function SwitchAnimationExample() {
    const [animation, setAnimation] = useState('walk');
    const [speed, setSpeed] = useState(1);

    return (
        <>
            {['idle', 'walk', 'run', 'float', 'wave', 'sit'].map((name) => (
                <button key={name} onClick={() => setAnimation(name)}>{name}</button>
            ))}
            <input
                type='range'
                min={0.2}
                max={3}
                step={0.1}
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
            />
            <div className='h-105 w-80'>
                <ReactMinevo3D animation={animation} animationSpeed={speed} transition={0.3} />
            </div>
        </>
    );
}`;

export function SwitchAnimation() {
    const [animation, setAnimation] = useState<Animation>('walk');
    const [speed, setSpeed] = useState(1);

    return (
        <ExampleTemplate
            number={2}
            category='Animation'
            title='Change animation'
            description='Choose a character animation and adjust its speed. A 0.3-second transition makes changes feel smoother.'
            vanillaCode={vanillaCode}
            reactCode={reactCode}
            preview={
                <div className='h-105 w-80'>
                    <ReactMinevo3D
                        animation={animation}
                        animationSpeed={speed}
                        transition={0.3}
                    />
                </div>
            }
            controls={
                <>
                    <p>
                        Animation: <strong>{animation}</strong>
                    </p>
                    <div className='flex flex-wrap gap-2'>
                        {ANIMATIONS.map(name => (
                            <button
                                key={name}
                                aria-pressed={animation === name}
                                onClick={() => setAnimation(name)}
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                    <label>
                        Speed: {speed.toFixed(1)}×
                        <input
                            type='range'
                            min={0.2}
                            max={3}
                            step={0.1}
                            value={speed}
                            onChange={event => setSpeed(Number(event.target.value))}
                        />
                    </label>
                </>
            }
        />
    );
}
