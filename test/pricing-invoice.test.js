'use strict';

var assert = require('node:assert/strict');
var test = require('node:test');
var invoice = require('../lib/invoice');
var pricing = require('../lib/pricing');

test('CURRENT BEHAVIOUR: pricing applies HSN GST after order discount', function () {
  var items = [
    { id: 1, name: 'Rice', hsn: '1006', price: 600, qty: 1 }
  ];

  assert.deepEqual(
    (({ subtotal, discount, taxable, tax, cgst, sgst, total }) =>
      ({ subtotal, discount, taxable, tax, cgst, sgst, total }))(pricing.computeTotals(items, 'SAVE10')),
    { subtotal: 600, discount: 60, taxable: 540, tax: 27, cgst: 13.5, sgst: 13.5, total: 567 }
  );
});

test('invoice figures match the billed pricing totals and GST breakdown', function () {
  var items = [
    { id: 1, name: 'Rice', sku: 'RICE-1', hsn: '1006', price: 640, qty: 1 }
  ];
  var billed = pricing.computeTotals(items, 'SAVE10');
  var figures = invoice.computeInvoiceFigures({ coupon: 'SAVE10', items: items });

  assert.deepEqual(
    { subtotal: figures.subtotal, discount: figures.discount, tax: figures.tax, cgst: figures.cgst, sgst: figures.sgst, total: figures.total },
    { subtotal: billed.subtotal, discount: billed.discount, tax: billed.tax, cgst: billed.cgst, sgst: billed.sgst, total: billed.total }
  );
  assert.equal(figures.rows[0].gstPercent, billed.lines[0].gstPercent);
  assert.equal(figures.rows[0].lineTax, billed.lines[0].tax);
});

test('invoice uses HSN GST and applies SAVE10 before calculating GST', function () {
  var order = {
    coupon: 'SAVE10',
    items: [{ id: 1, name: 'Rice', hsn: '1006', price: 600, qty: 1 }]
  };

  var figures = invoice.computeInvoiceFigures(order);
  assert.deepEqual(
    { subtotal: figures.subtotal, discount: figures.discount, tax: figures.tax, cgst: figures.cgst, sgst: figures.sgst, total: figures.total },
    { subtotal: 600, discount: 60, tax: 27, cgst: 13.5, sgst: 13.5, total: 567 }
  );
  assert.equal(figures.rows[0].gstPercent, 5);
  assert.equal(figures.rows[0].lineTax, 27);
});

test('invoice respects coupon maximum discounts and minimum subtotals', function () {
  var items = [{ id: 2, name: 'Rice', hsn: '1006', price: 3000, qty: 1 }];
  var order = { coupon: 'WHOLESALE15', items: items };

  assert.equal(pricing.computeTotals(items, 'WHOLESALE15').discount, 400);
  assert.equal(invoice.computeInvoiceFigures(order).discount, 400);

  var belowMinimum = { coupon: 'SAVE10', items: [{ name: 'Rice', price: 100, qty: 1 }] };
  assert.equal(pricing.computeTotals(belowMinimum.items, 'SAVE10').discount, 0);
  assert.equal(invoice.computeInvoiceFigures(belowMinimum).discount, 0);
});

test('invoice ignores an inactive configured coupon', function () {
  var order = {
    coupon: 'DIWALI20',
    items: [{ name: 'Rice', price: 1000, qty: 1 }]
  };

  assert.equal(pricing.computeTotals(order.items, 'DIWALI20').discount, 0);
  assert.equal(invoice.computeInvoiceFigures(order).discount, 0);
});