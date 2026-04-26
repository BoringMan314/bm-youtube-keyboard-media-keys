const STORAGE_ENABLED_KEY = 'mediaKeysEnabled';

function t(key) {
	return chrome.i18n.getMessage(key) || key;
}

document.addEventListener('DOMContentLoaded', async () => {
	document.title = t('popupHeading');
	document.getElementById('popup-heading').textContent = t('popupHeading');
	document.getElementById('popup-enable-label').textContent = t('popupEnableLabel');
	document.getElementById('open-help').textContent = t('popupOpenHelp');
	document.getElementById('popup-hint').textContent = t('popupHintDisabled');

	const toggle = document.getElementById('toggle');
	const data = await chrome.storage.local.get(STORAGE_ENABLED_KEY);
	toggle.checked = data[STORAGE_ENABLED_KEY] !== false;

	toggle.addEventListener('change', async () => {
		const on = toggle.checked;
		await chrome.storage.local.set({ [STORAGE_ENABLED_KEY]: on });
		try {
			await chrome.runtime.sendMessage({ type: 'mediaKeysEnabledSync', enabled: on });
		} catch {}
	});

	document.getElementById('open-help').addEventListener('click', () => {
		chrome.runtime.openOptionsPage();
		window.close();
	});
});
