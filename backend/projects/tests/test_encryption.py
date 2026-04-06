from projects.encryption import decrypt_api_key, encrypt_api_key


class TestEncryption:

    def test_roundtrip_encrypt_decrypt(self):
        plaintext = 'AIzaSyD-test-key-12345'
        ciphertext = encrypt_api_key(plaintext)
        assert ciphertext != plaintext
        assert decrypt_api_key(ciphertext) == plaintext

    def test_different_plaintexts_produce_different_ciphertexts(self):
        c1 = encrypt_api_key('key-one')
        c2 = encrypt_api_key('key-two')
        assert c1 != c2

    def test_encrypt_produces_non_empty_string(self):
        ciphertext = encrypt_api_key('test')
        assert isinstance(ciphertext, str)
        assert len(ciphertext) > 0
