import { Stream } from 'stream';

export const isStream = (stream: any) => !!stream && stream instanceof Stream;
