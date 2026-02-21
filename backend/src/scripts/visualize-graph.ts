import * as fs from 'fs';
import * as path from 'path';
import { chatGraph } from '../graphs/chat.graph';
import { quizGenerationGraph } from '../graphs/quiz-generation.graph';
import { createLogger } from '../utils/logger';

const logger = createLogger('VISUALIZE-GRAPH');

async function visualizeGraph() {
    const outputDir = path.resolve(__dirname, '../graphs/visualizations');
    const outputPaths = ['chat-graph.png', 'quiz-generation-graph.png'].map(name => path.join(outputDir, name));

    logger.info('Generating graphs visualization...');

    const [chatGraphBlob, quizGenerationGraphBlob] = await Promise.all([
        chatGraph.getGraphAsync().then(graph => graph.drawMermaidPng()),
        quizGenerationGraph.getGraphAsync().then(graph => graph.drawMermaidPng()),
    ]);

    const pngData = await Promise.all(
        [chatGraphBlob, quizGenerationGraphBlob].map(async blob => Buffer.from(await blob.arrayBuffer()))
    );
    fs.mkdirSync(outputDir, { recursive: true });
    outputPaths.forEach((filePath, index) => {
        fs.writeFileSync(filePath, pngData[index]);
        logger.info(`Graph saved to: ${filePath}`);
    });
}

visualizeGraph().catch((err) => {
    logger.error('Failed to generate graph:', err.message);
    process.exit(1);
});
