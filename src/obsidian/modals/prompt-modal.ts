import { Modal, ButtonComponent, TextComponent } from "obsidian";

export class PromptModal extends Modal {
	private resolve: (value: string) => void;
	private reject: () => void;
	private submitted = false;
	private value: string;
	private initialValue?: string;

	constructor(initialValue?: string) {
		super(app);
		this.initialValue = initialValue;
		this.value = initialValue || "";
	}

	listenInput(evt: KeyboardEvent) {
		if (evt.key === "Enter") {
			evt.preventDefault();
			this.enterCallback(evt);
		}
	}

	onOpen(): void {
		this.titleEl.setText("YouTube URL");
		this.createForm();
	}

	onClose(): void {
		this.contentEl.empty();
		if (!this.submitted) {
			this.reject();
		}
	}

	createForm(): void {
		// Input field
		const textInput = new TextComponent(this.contentEl);
		textInput.inputEl.style.width = "100%";
		textInput.onChange((value) => (this.value = value));
		textInput.inputEl.addEventListener("keydown", (evt: KeyboardEvent) =>
			this.enterCallback(evt),
		);

		// Pre-populate with initial value if provided
		if (this.initialValue) {
			textInput.setValue(this.initialValue);
			// Select all text so user can easily replace it
			textInput.inputEl.select();
		}

		textInput.inputEl.focus();

		// Submit button
		const buttonDiv = this.modalEl.createDiv();
		buttonDiv.addClass("modal-button-container");
		const submitButton = new ButtonComponent(buttonDiv);
		submitButton.buttonEl.addClass("mod-cta");
		submitButton.setButtonText("Submit").onClick((evt: Event) => {
			this.resolveAndClose(evt);
		});
	}

	private enterCallback(evt: KeyboardEvent) {
		if (evt.key === "Enter") {
			this.resolveAndClose(evt);
		}
	}

	private resolveAndClose(evt: Event | KeyboardEvent) {
		this.submitted = true;
		evt.preventDefault();
		this.resolve(this.value);
		this.close();
	}

	async openAndGetValue(
		resolve: (value: string) => void,
		reject: () => void,
	): Promise<void> {
		this.resolve = resolve;
		this.reject = reject;
		this.open();
	}
}
