import { ReactMinevo3D } from '../../../src/ReactMinevo3D';
import { ExampleTemplate } from '../ExampleTemplate';

const vanillaCode = `import { CharacterViewer } from 'minevo3d';

const container = document.querySelector('#character');
if (!(container instanceof HTMLElement)) throw new Error('Character container not found');

const viewer = new CharacterViewer(container, {
    globalLight: { directional: 0 },
    cameraLight: { enabled: true, intensity: 0.7, yaw: -20, pitch: 25 },
});

viewer.dispose();`;

const reactCode = `import { ReactMinevo3D } from 'minevo3d/react';

export function CheapLightingExample() {
    return (
        <div className='h-105 w-80'>
            <ReactMinevo3D
                globalLight={{ directional: 0 }}
                cameraLight={{ enabled: true, intensity: 0.7, yaw: -20, pitch: 25 }}
            />
        </div>
    );
}`;

export function CheapLighting() {
    return (
        <ExampleTemplate
            number={14}
            category='Lighting'
            title='Low-cost lighting'
            description='Use ambient light and one camera light without directional sunlight to reduce the number of lights the renderer must calculate.'
            vanillaCode={vanillaCode}
            reactCode={reactCode}
            preview={
                <div className='h-105 w-80'>
                    <ReactMinevo3D
                        globalLight={{ directional: 0 }}
                        cameraLight={{
                            enabled: true,
                            intensity: 0.7,
                            yaw: -20,
                            pitch: 25,
                        }}
                    />
                </div>
            }
        />
    );
}
