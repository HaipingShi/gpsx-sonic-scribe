
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const projectId = '1118aa6e-a12c-4fca-ba44-d53469afaa7b';
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
            audioChunks: {
                include: {
                    draftSegment: {
                        include: { polishedSegment: true }
                    }
                }
            }
        }
    });

    if (!project) {
        console.log('Project not found');
        return;
    }

    console.log('Project Status:', project.status);
    console.log('Checkpoint:', project.checkpoint);
    console.log('Chunks:', project.audioChunks.length);

    project.audioChunks.forEach(chunk => {
        console.log(`Chunk ${chunk.index}:`);
        console.log(`  Silence: ${chunk.isSilence}`);
        console.log(`  Raw Text: ${chunk.draftSegment?.rawText ? 'YES' : 'NO'}`);
        console.log(`  Polished: ${chunk.draftSegment?.polishedSegment?.polishedText ? 'YES' : 'NO'}`);
        console.log(`  Validation Status: ${chunk.draftSegment?.validationStatus}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
