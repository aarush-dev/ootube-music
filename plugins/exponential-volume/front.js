const exponentialVolume = () => {
	const EXPONENT = 3;
	const storedOriginalVolumes = new WeakMap();
	const { get, set } = Object.getOwnPropertyDescriptor(
		HTMLMediaElement.prototype,
		"volume"
	);
	Object.defineProperty(HTMLMediaElement.prototype, "volume", {
		get() {
			const lowVolume = get.call(this);
			const calculatedOriginalVolume = lowVolume ** (1 / EXPONENT);
			const storedOriginalVolume = storedOriginalVolumes.get(this);
			const storedDeviation = Math.abs(
				storedOriginalVolume - calculatedOriginalVolume
			);
			const originalVolume =
				storedDeviation < 0.01
					? storedOriginalVolume
					: calculatedOriginalVolume;
			return originalVolume;
		},
		set(originalVolume) {
			const lowVolume = originalVolume ** EXPONENT;
			storedOriginalVolumes.set(this, originalVolume);
			set.call(this, lowVolume);
		},
	});
};
module.exports = () =>
	document.addEventListener("apiLoaded", exponentialVolume, {
		once: true,
		passive: true,
	});
