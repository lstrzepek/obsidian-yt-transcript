import { TranscriptResponse } from "../../core/youtube-transcript";
import { AppError } from "./error-handling-service";

export enum TranscriptViewState {
	IDLE = "IDLE",
	LOADING = "LOADING",
	LOADED = "LOADED",
	ERROR = "ERROR",
}

export interface StateContext {
	url?: string;
	data?: TranscriptResponse;
	error?: AppError;
}

export type StateHandler = (context: StateContext) => Promise<void>;

/**
 * Service that manages transcript view state machine
 * Automatically executes handlers on state transitions
 */
export class TranscriptStateService {
	private currentState: TranscriptViewState = TranscriptViewState.IDLE;
	private context: StateContext = {};
	private handlers: Map<TranscriptViewState, StateHandler> = new Map();

	getState(): TranscriptViewState {
		return this.currentState;
	}

	getContext(): StateContext {
		return { ...this.context };
	}

	/**
	 * Registers a handler for a specific state
	 * Handler will be called whenever transitioning to this state
	 */
	onEnter(state: TranscriptViewState, handler: StateHandler): void {
		this.handlers.set(state, handler);
	}

	/**
	 * Transitions to LOADING state and executes handler
	 */
	async toLoading(url: string): Promise<void> {
		this.currentState = TranscriptViewState.LOADING;
		this.context = { url };
		await this.executeHandler(TranscriptViewState.LOADING);
	}

	/**
	 * Transitions to LOADED state and executes handler
	 */
	async toLoaded(data: TranscriptResponse): Promise<void> {
		this.currentState = TranscriptViewState.LOADED;
		this.context = {
			...this.context,
			data,
			error: undefined,
		};
		await this.executeHandler(TranscriptViewState.LOADED);
	}

	/**
	 * Transitions to ERROR state and executes handler
	 */
	async toError(error: AppError): Promise<void> {
		this.currentState = TranscriptViewState.ERROR;
		this.context = {
			...this.context,
			data: undefined,
			error,
		};
		await this.executeHandler(TranscriptViewState.ERROR);
	}

	/**
	 * Transitions to IDLE state and executes handler
	 */
	async toIdle(): Promise<void> {
		this.currentState = TranscriptViewState.IDLE;
		this.context = {};
		await this.executeHandler(TranscriptViewState.IDLE);
	}

	/**
	 * Executes the handler for the current state
	 */
	private async executeHandler(state: TranscriptViewState): Promise<void> {
		const handler = this.handlers.get(state);
		if (handler) {
			await handler(this.context);
		}
	}

	/**
	 * Checks if we're in a specific state
	 */
	is(state: TranscriptViewState): boolean {
		return this.currentState === state;
	}

	/**
	 * Checks if already loaded (prevents unnecessary reloads)
	 */
	isAlreadyLoaded(): boolean {
		return (
			this.currentState === TranscriptViewState.LOADED &&
			this.context.data !== undefined
		);
	}

	/**
	 * Resets the state machine
	 */
	reset(): void {
		this.currentState = TranscriptViewState.IDLE;
		this.context = {};
	}
}
