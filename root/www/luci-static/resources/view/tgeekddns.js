'use strict';
'require view';
'require rpc';

const status = rpc.declare({ object: 'tgeekddns', method: 'status' });
const save = rpc.declare({ object: 'tgeekddns', method: 'save', params: ['payload'] });
const enable = rpc.declare({ object: 'tgeekddns', method: 'enable' });
const disable = rpc.declare({ object: 'tgeekddns', method: 'disable' });

function button(label, handler, result) {
	return E('button', {
		type: 'button', class: 'cbi-button cbi-button-action',
		click: async function(ev) {
			ev.currentTarget.disabled = true;
			const target = ev.currentTarget;
			try {
				const response = await handler();
				if (!response || !response.ok)
					throw new Error(response && response.error || 'RPC 操作失败');
				result.textContent = '操作成功';
			} catch (err) {
				result.textContent = err.message;
			} finally {
				target.disabled = false;
			}
		}
	}, label);
}

function field(label, node) {
	return E('div', { class: 'cbi-value' }, [
		E('label', { class: 'cbi-value-title' }, label),
		E('div', { class: 'cbi-value-field' }, [node])
	]);
}

function input(value, secret) {
	return E('input', {
		type: secret ? 'password' : 'text',
		autocomplete: secret ? 'new-password' : 'off',
		class: 'cbi-input-text', value: value || ''
	});
}

function panel(provider, name, config, interfaces) {
	const cfg = config || {};
	const rr = input(cfg.rr || '@');
	const domain = input(cfg.domain);
	const key = input('', true);
	const secret = input('', true);
	const result = E('p', { role: 'status' }, cfg.credentials ? '凭据已配置，两项留空沿用原值。' : '首次配置请填写两项凭据。');
	const fields = [
		field('托管域名', domain), field('主机记录', rr),
		field(provider === 'aliyun' ? 'AccessKey ID' : 'SecretId', key),
		field(provider === 'aliyun' ? 'AccessKey Secret' : 'SecretKey', secret)
	];
	const records = {};
	for (const type of ['A', 'AAAA']) {
		const record = (cfg.records || {})[type];
		const checked = E('input', { type: 'checkbox' });
		checked.checked = record ? true : (!config && type === 'A');
		const id = input(record && record.id);
		const source = E('select', { class: 'cbi-input-select' });
		for (const name of new Set(['auto', ...interfaces, ...(record ? [record.source] : [])]))
			source.appendChild(E('option', { value: name }, name === 'auto' ? '自动选择' : name));
		source.value = record ? record.source : 'auto';
		records[type] = { checked, id, source };
		fields.push(field('更新 ' + type, checked), field(type + ' 接口', source), field(type + ' 记录 ID', id));
	}
	return E('div', { class: 'cbi-section' }, [
		E('h3', {}, name), ...fields,
		button('保存 ' + name, async function() {
			const selected = {};
			for (const type of Object.keys(records)) {
				const row = records[type];
				if (row.checked.checked)
					selected[type] = { id: row.id.value, source: row.source.value };
			}
			const response = await save(JSON.stringify({
				provider, domain: domain.value, rr: rr.value, records: selected,
				key: key.value, secret: secret.value
			}));
			if (response && response.ok)
				key.value = secret.value = '';
			return response;
		}, result), result
	]);
}

return view.extend({
	load: function() { return status(); },
	render: function(data) {
		if (!data || !data.ok)
			return E('p', {}, data && data.error || '无法读取 TGEEK DDNS 配置');
		const state = E('p', {}, '事件更新' + (data.enabled ? '已启用' : '已停用'));
		const result = E('p', { role: 'status' });
		return E('div', {}, [
			E('h2', {}, 'TGEEK DDNS'),
			E('p', {}, '保存配置不会立即写入云端。可通过 SSH 运行 tgeek-ddns check 或 tgeek-ddns sync。'),
			panel('aliyun', '阿里云', data.providers.aliyun, data.interfaces),
			panel('tencent', '腾讯云', data.providers.tencent, data.interfaces),
			state,
			button('启用事件更新', async function() {
				const response = await enable();
				if (response && response.ok) state.textContent = '事件更新已启用';
				return response;
			}, result),
			' ',
			button('停用事件更新', async function() {
				const response = await disable();
				if (response && response.ok) state.textContent = '事件更新已停用';
				return response;
			}, result),
			result
		]);
	},
	handleSaveApply: null, handleSave: null, handleReset: null
});
