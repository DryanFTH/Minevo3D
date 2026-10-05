import { useRef } from 'react';

import { ReactMinevo3D, type ReactMinevo3DHandle } from '../../../src/ReactMinevo3D';
import { ExampleTemplate } from '../ExampleTemplate';

const vanillaCode = `import { CharacterViewer } from 'minevo3d';

const container = document.querySelector('#character');
if (!(container instanceof HTMLElement)) throw new Error('Character container not found');

const viewer = new CharacterViewer(container, { animation: 'idle', camera: { azimuth: 0 }, controls: false });
container.addEventListener('pointermove', (event) => {
    const bounds = container.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    const y = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
    viewer.setPose({ head: { yaw: x * 45, pitch: y * 25 } });
});
container.addEventListener('pointerleave', () => viewer.setPose(undefined));

viewer.dispose();`;

const reactCode = `import { useRef } from 'react';
import { ReactMinevo3D, type ReactMinevo3DHandle } from 'minevo3d/react';

export function LookAtPointerExample() {
    const viewerRef = useRef<ReactMinevo3DHandle>(null);

    return (
        <div
            className='h-105 w-80'
            onPointerMove={event => {
                const bounds = event.currentTarget.getBoundingClientRect();
                const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
                const y = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
                viewerRef.current?.setPose({ head: { yaw: x * 45, pitch: y * 25 } });
            }}
            onPointerLeave={() => viewerRef.current?.setPose(undefined)}
        >
            <ReactMinevo3D
                ref={viewerRef}
                animation='idle'
                camera={{ azimuth: 0 }}
                controls={false}
            />
        </div>
    );
}`;

export function LookAtPointer() {
    const viewerRef = useRef<ReactMinevo3DHandle>(null);

    return (
        <ExampleTemplate
            number={5}
            category='Pose & rigging'
            title='Head follows the pointer'
            description='Move the pointer over the preview to move the character’s head. The pose is applied through a ref, so pointer movement does not trigger a React render.'
            vanillaCode={vanillaCode}
            reactCode={reactCode}
            preview={
                <div
                    className='h-105 w-80'
                    onPointerMove={event => {
                        const bounds = event.currentTarget.getBoundingClientRect();
                        const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
                        const y = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
                        viewerRef.current?.setPose({
                            head: { yaw: x * 45, pitch: y * 25 },
                        });
                    }}
                    onPointerLeave={() => viewerRef.current?.setPose(undefined)}
                >
                    <ReactMinevo3D
                        ref={viewerRef}
                        animation='idle'
                        camera={{ azimuth: 0 }}
                        controls={false}
                    />
                </div>
            }
        />
    );
}
