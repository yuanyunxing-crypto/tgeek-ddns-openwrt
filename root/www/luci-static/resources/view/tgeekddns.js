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

function select(options, value) {
	const node = E('select', { class: 'cbi-input-select' },
		options.map(([id, name]) => E('option', { value: id }, name)));
	node.value = value;
	return node;
}

function panel(provider, name, config, interfaces) {
	const cfg = config || {};
	const key = input('', true);
	const secret = input('', true);
	const result = E('p', { role: 'status' }, cfg.credentials ? '凭据已配置，两项留空沿用原值。' : '首次配置请填写两项凭据。');
	const list = E('div');
	const rows = [];
	const lines = [['any', '任意（只匹配唯一记录）'], ['default', '默认'],
		['unicom', '联通'], ['telecom', '电信']];

	function add(task) {
		const domain = input(task.domain);
		const rr = input(task.rr || '@');
		const kind = select([['A', 'A (IPv4)'], ['AAAA', 'AAAA (IPv6)']], task.kind || 'A');
		const line = select(lines, task.line || 'default');
		const source = select(Array.from(new Set(['auto', ...interfaces, task.source || 'auto']),
			id => [id, id === 'auto' ? '自动选择' : id]), task.source || 'auto');
		const id = input(task.id);
		id.placeholder = '留空自动查找';
		const row = { domain, rr, kind, line, source, id };
		const node = E('fieldset', { class: 'cbi-section' }, [
			field('托管域名', domain), field('主机记录', rr),
			field('记录类型', kind), field('云端解析线路', line),
			field('OpenWrt 接口', source), field('记录 ID', id),
			E('button', { type: 'button', class: 'cbi-button cbi-button-remove',
				click: function() { rows.splice(rows.indexOf(row), 1); node.remove(); } }, '移除此任务')
		]);
		rows.push(row);
		list.appendChild(node);
	}

	for (const task of cfg.tasks || [])
		add(task);

	return E('div', { class: 'cbi-section' }, [
		E('h3', {}, name),
		field(provider === 'aliyun' ? 'AccessKey ID' : 'SecretId', key),
		field(provider === 'aliyun' ? 'AccessKey Secret' : 'SecretKey', secret),
		list,
		E('button', { type: 'button', class: 'cbi-button cbi-button-add', click: function() {
			const previous = rows[rows.length - 1];
			if (rows.length < 24)
				add(previous ? { domain: previous.domain.value, rr: previous.rr.value,
					kind: previous.kind.value } : {});
		} }, '添加解析任务'),
		' ',
		button('保存 ' + name, async function() {
			const tasks = rows.map(row => ({
				domain: row.domain.value, rr: row.rr.value, kind: row.kind.value,
				line: row.line.value, source: row.source.value, id: row.id.value
			}));
			const response = await save(JSON.stringify({ provider, tasks, key: key.value, secret: secret.value }));
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
			result,
			E('h3', {}, '最近 10 条日志'),
			E('p', {}, '重新加载页面可查看最新结果。路由器重启后清空。'),
			E('pre', { style: 'white-space: pre-wrap' }, (data.logs || []).join('\n') || '暂无日志')
		]);
	},
	handleSaveApply: null, handleSave: null, handleReset: null
});
