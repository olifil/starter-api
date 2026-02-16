declare module 'matomo-tracker' {
  export interface TrackParams {
    url: string;
    action_name?: string;
    e_c?: string;
    e_a?: string;
    e_n?: string;
    e_v?: number;
    uid?: string;
    [key: string]: any;
  }

  export default class MatomoTracker {
    constructor(siteId: number, trackerUrl: string);
    track(params: TrackParams): Promise<void>;
  }
}
