import { useRef } from 'react';

import { ReactMinevo3D, type ReactMinevo3DHandle } from '../../../src/ReactMinevo3D';
import { ExampleTemplate } from '../ExampleTemplate';

const vanillaCode = `import { CharacterViewer } from 'minevo3d';

const container = document.querySelector('#character');
if (!(container instanceof HTMLElement)) throw new Error('Character container not found');

const viewer = new CharacterViewer(container);
viewer.play('run', { transition: 0.15 });

document.querySelector('#run')?.addEventListener('click', () => {
    viewer.play('run', { transition: 0.15 });
});
document.querySelector('#idle')?.addEventListener('click', () => viewer.play('idle'));
document.querySelector('#screenshot')?.addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = viewer.screenshot();
    link.download = 'character.png';
    link.click();
});

viewer.dispose();`;

const reactCode = `import { useRef } from 'react';
import { ReactMinevo3D, type ReactMinevo3DHandle } from 'minevo3d/react';

export function ImperativeExample() {
    const viewerRef = useRef<ReactMinevo3DHandle>(null);

    return (
        <>
            <button onClick={() => viewerRef.current?.play('run', { transition: 0.15 })}>
                Run
            </button>
            <button onClick={() => viewerRef.current?.play('idle')}>Idle</button>
            <button
                onClick={() => {
                    const image = viewerRef.current?.screenshot();
                    if (!image) return;

                    const link = document.createElement('a');
                    link.href = image;
                    link.download = 'character.png';
                    link.click();
                }}
            >
                Save PNG
            </button>
            <div className='h-105 w-80'>
                <ReactMinevo3D ref={viewerRef} />
            </div>
        </>
    );
}`;

export function Imperative() {
    const viewerRef = useRef<ReactMinevo3DHandle>(null);

    const saveScreenshot = () => {
        const image = viewerRef.current?.screenshot();
        if (!image) return;

        const link = document.createElement('a');
        link.href = image;
        link.download = 'character.png';
        link.click();
    };

    return (
        <ExampleTemplate
            number={8}
            category='Controls'
            title='Imperative controls and screenshots'
            description='Use a ref to change the character animation directly and save the preview as a PNG image.'
            vanillaCode={vanillaCode}
            reactCode={reactCode}
            preview={
                <div className='h-105 w-80'>
                    <ReactMinevo3D ref={viewerRef} />
                </div>
            }
            controls={
                <>
                    <button
                        onClick={() =>
                            viewerRef.current?.play('run', { transition: 0.15 })
                        }
                    >
                        Run
                    </button>
                    <button onClick={() => viewerRef.current?.play('idle')}>Idle</button>
                    <button onClick={saveScreenshot}>Save PNG</button>
                </>
            }
        />
    );
}
